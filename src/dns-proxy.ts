import dgram from 'node:dgram';
import type { RemoteInfo } from 'node:dgram';
import dnsPacket, { type DnsAnswer } from 'dns-packet';
import { createLogger } from './logger.js';
import { defaultConfig } from './config.js';

export class DnsProxy {
  private server: dgram.Socket;
  private logger = createLogger('info');
  private matchedHostnames: string[];

  constructor(private config: typeof defaultConfig) {
    this.server = dgram.createSocket('udp4');
    this.setupServer();
    this.matchedHostnames = config.matchedHostnames;
  }

  private isMatchedHostname(hostname: string) {
    return this.matchedHostnames.some(pattern => {
      if (pattern.startsWith('*.')) {
        // For wildcard patterns like *.example.com
        const domain = pattern.slice(2); // Remove the *. prefix
        return hostname.endsWith(domain);
      }
      // For exact matches
      return hostname === pattern;
    });
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
    const query = dnsPacket.decode(msg);
    const question = query.questions[0];

    if (!question) {
      throw new Error('No question in DNS query');
    }

    if (question.type === 'A') this.logger.info('DNS query:', {
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

        // TODO: Implement timeout
        // // Set timeout
        // setTimeout(() => {
        //   client.close();
        //   reject(new Error('DNS request timeout'));
        // }, this.config.timeout);
      });

      const decodedResponse = dnsPacket.decode(response);

      if (this.isMatchedHostname(question.name)) {
        decodedResponse.answers.filter((a: DnsAnswer) => a.type === 'A' || a.type === 'AAAA').forEach((a: DnsAnswer) => {
          this.logger.info(`${question.name} ${a.type}: ${a.data}`);
        })
      } else {
        this.logger.warn(`not matched ${question.name} ${question.type}`);
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

      return response;

    } catch (error) {
      throw error;
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
