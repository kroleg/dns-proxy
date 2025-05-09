# DNS Proxy

A TypeScript-based DNS proxy that forwards DNS requests to specified DNS servers and provides detailed resolution information in JSON format.

## Requirements

### Technical Stack
- Node.js (latest LTS version)
- TypeScript
- Vitest for testing
- DNS packet parsing library (e.g., `dns-packet`)

### Core Features
1. DNS Request Forwarding
   - Support multiple upstream DNS servers
   - Round-robin or failover configuration for multiple servers
   - UDP protocol support (primary)
   - TCP protocol support (optional)

2. Response Processing
   - Parse DNS responses
   - Extract and format the following information:
     - Hostname
     - All resolved IP addresses
     - CNAME records
     - Record types (A, AAAA, CNAME)
     - TTL values

3. Output Format
   ```json
   {
     "hostname": "example.com",
     "resolved": {
       "ips": ["93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"],
       "cname": "example.com.cdn.cloudflare.net",
       "recordTypes": ["A", "AAAA", "CNAME"],
       "ttl": 300
     },
     "upstreamServer": "8.8.8.8",
     "responseTime": 45
   }
   ```

### Configuration
- Configurable listening port (default: 53)
- Configurable upstream DNS servers
- Optional configuration for:
  - Timeout settings
  - Retry attempts
  - Response caching
  - Logging levels

### Testing Requirements
- Unit tests for:
  - DNS packet parsing
  - Response formatting
  - Server configuration
  - Error handling
- Integration tests for:
  - End-to-end DNS resolution
  - Multiple upstream server handling
  - CNAME resolution chain
- Performance tests for:
  - Concurrent request handling
  - Response time benchmarks

### Error Handling
- Invalid DNS requests
- Upstream server failures
- Timeout handling
- Malformed responses
- Network errors

### Performance Considerations
- Efficient packet parsing
- Minimal memory footprint
- Support for concurrent requests
- Response caching (optional)

### Security
- Input validation
- Rate limiting (optional)
- Access control (optional)

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Start the server:
   ```bash
   npm start
   ```

## Project Structure
```
src/
├── config/         # Configuration management
├── dns/           # DNS protocol handling
├── server/        # Server implementation
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
tests/
├── unit/          # Unit tests
└── integration/   # Integration tests
```

## Future Enhancements
- DNS over HTTPS (DoH) support
- DNS over TLS (DoT) support
- Response caching
- Metrics collection
- Prometheus integration
- Web interface for monitoring
