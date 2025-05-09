export interface DnsServerConfig {
  host: string;
  port: number;
}

export interface ProxyConfig {
  listenPort: number;
  upstreamServers: DnsServerConfig[];
  timeout: number;
  retryAttempts: number;
  enableCache: boolean;
  cacheTTL: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export const defaultConfig: ProxyConfig = {
  listenPort: 53,
  upstreamServers: [
    { host: '192.168.1.1', port: 53 },
    // { host: '8.8.4.4', port: 53 }
  ],
  timeout: 5000,
  retryAttempts: 3,
  enableCache: false,
  cacheTTL: 300,
  logLevel: 'info'
};
