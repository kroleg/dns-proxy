import dgram from 'node:dgram';
import type { RemoteInfo } from 'node:dgram';
import dnsPacket, { type DnsAnswer } from 'dns-packet';
import type { ProxyConfig } from '../types/config.js';
import type { DnsResponse } from '../types/dns.js';
import { createLogger } from '../utils/logger.js';

interface DnsResponse {
  hostname: string;
  resolvedIPs: string[];
  cname?: string;
  recordTypes: string[];
  // ttl: number;
  // upstreamServer: string;
  // responseTime: number;
}

export class DnsServer {
  private server: dgram.Socket;
  private logger = createLogger({ logLevel: 'info' });
  private matcheHostnames = [
    '*.apple-dns.net',
  ]
  private cnamesForMatchedRequests: Array<{ hostname: string, cname: string, expiresAt?: Date }> = []

  constructor(private config: ProxyConfig) {
    this.server = dgram.createSocket('udp4');
    this.setupServer();
  }

  private isMatchedHostname(hostname: string) {
    return this.matcheHostnames.some(h => hostname.endsWith(h));
  }

  private isCnameForMatchedRequest(cname: string) {
    return this.cnamesForMatchedRequests.some(c => cname.endsWith(c.hostname));
  }

  private addCnameForMatchedRequest(hostname: string, cname: string) {
    this.cnamesForMatchedRequests.push({ hostname, cname });
  }


  private setupServer() {
    this.server.on('error', (err: Error) => {
      this.logger.error('Server error:', err);
    });

    this.server.on('message', async (msg: Buffer, rinfo: RemoteInfo) => {
      try {
        const response = await this.handleDnsRequest(msg);
        this.server.send(response, rinfo.port, rinfo.address);
      } catch (error) {
        this.logger.error('Error handling DNS request:', error);
      }
    });
  }

  private async handleDnsRequest(msg: Buffer): Promise<Buffer> {
    const startTime = Date.now();
    const query = dnsPacket.decode(msg);
    const question = query.questions[0];

    if (!question) {
      throw new Error('No question in DNS query');
    }

    const ignoredTypes = ['AXFR', 'IXFR', 'UNKNOWN_65'];


    this.logger.info('DNS query:', {
      type: question.type,
      name: question.name,
      class: question.class
    });

    // Create a UDP client for the upstream server
    const client = dgram.createSocket('udp4');
    const upstreamServer = this.config.upstreamServers[0]; // TODO: Implement round-robin

    try {
      const response = await new Promise<Buffer>((resolve, reject) => {
        client.on('error', reject);
        client.on('message', (response) => {
          resolve(response);
          client.close();
        });

        client.send(msg, upstreamServer.port, upstreamServer.host);

        // Set timeout
        setTimeout(() => {
          client.close();
          reject(new Error('DNS request timeout'));
        }, this.config.timeout);
      });

      const decodedResponse = dnsPacket.decode(response);

      if (decodedResponse.type === 'CNAME') {
        const cname = decodedResponse.answers.find((a: DnsAnswer) => a.type === 'CNAME')?.data as string;
        if (this.isMatchedHostname(question.name)) {
          this.addCnameForMatchedRequest(question.name, cname);
        }
      }

      if (this.isMatchedHostname(question.name)) {
        this.logger.info('matched hostname', question.name);
        if (decodedResponse.type === 'A') {
          decodedResponse.answers.forEach((a: DnsAnswer) => {
            if (a.type === 'A') {
              this.logger.info(`${question.name} -> ${a.data}`);
            }
            else if (a.type === 'AAAA') {
              this.logger.info(`${question.name} -> AAAA: -> ${a.data}`);
            }
            else if (a.type === 'CNAME') {
              this.logger.info(`${question.name} -> CNAME: -> ${a.data}`);
            }
          });
        } else {
          this.logger.warn(`${question.name} -> ${decodedResponse.type}`);
        }
      }

      // Log raw response for debugging
      this.logger.debug('Raw DNS response:', {
        type: decodedResponse.type,
        flags: decodedResponse.flags,
        answers: decodedResponse.answers.map(a => ({
          type: a.type,
          name: a.name,
          ttl: a.ttl,
          data: a.data
        }))
      });

      // const dnsResponse = {
      //   hostname: question.name,
      //   resolvedIPs:
      //     decodedResponse.answers
      //       .filter((a: DnsAnswer) => a.type === 'A' || a.type === 'AAAA')
      //       .map((a: DnsAnswer) => {
      //         if (typeof a.data === 'string') {
      //           return a.data;
      //         } else if (Array.isArray(a.data)) {
      //           return a.data.join(',');
      //         } else if (Buffer.isBuffer(a.data)) {
      //           return a.data.toString();
      //         }
      //         return String(a.data);
      //       }),
      //   cname: decodedResponse.answers.find((a: DnsAnswer) => a.type === 'CNAME')?.data as string,
      //   recordTypes: [...new Set(decodedResponse.answers.map((a: DnsAnswer) => a.type))],
      //   // ttl: Math.min(...decodedResponse.answers.map((a: DnsAnswer) => a.ttl)),
      //   // upstreamServer: upstreamServer.host,
      //   // responseTime: Date.now() - startTime
      // };

      // if (!ignoredTypes.includes(decodedResponse.type)) {
      //   // this.logger.info('r', dnsResponse);
      // }

      return response;

    } catch (error) {
      throw error;
    } finally {
      // client.close();
    }
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.bind(this.config.listenPort, () => {
        this.logger.info(`DNS server listening on port ${this.config.listenPort}`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        this.logger.info('DNS server stopped');
        resolve();
      });
    });
  }
}
