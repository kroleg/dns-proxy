export const defaultConfig = {
  listenPort: 53,
  upstreamServers: [
    // { host: '192.168.1.1', port: 53 },
    { host: '8.8.4.4', port: 53 }
  ],
  matchedHostnames: [
    '.apple-dns.net',
    '.youtube.com',
    'chatgpt.com',
    '*.googlevideo.com',
  ],
  logResolvedToFile: 'dns-proxy.log',
  // timeout: 5000,
};
