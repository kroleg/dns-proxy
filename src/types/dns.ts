
export interface DnsRecord {
  type: string;
  name: string;
  ttl: number;
  data: string;
}

export interface DnsQuery {
  type: string;
  name: string;
}
