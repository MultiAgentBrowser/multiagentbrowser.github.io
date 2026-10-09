export interface DoHProvider {
  id: string;
  name: string;
  endpoint: string;
  privacyPolicyUrl: string;
}

export class DNSConfig {
  public static readonly DOH_PROVIDERS: DoHProvider[] = [
    {
      id: 'cloudflare',
      name: 'Cloudflare 1.1.1.1 (Privacy-First)',
      endpoint: 'https://cloudflare-dns.com/dns-query',
      privacyPolicyUrl: 'https://www.cloudflare.com/privacypolicy/',
    },
    {
      id: 'quad9',
      name: 'Quad9 (Malware & Tracker Blocking)',
      endpoint: 'https://dns.quad9.net/dns-query',
      privacyPolicyUrl: 'https://www.quad9.net/privacy/policy/',
    },
    {
      id: 'google',
      name: 'Google Public DNS',
      endpoint: 'https://dns.google/dns-query',
      privacyPolicyUrl: 'https://developers.google.com/speed/public-dns/privacy',
    },
  ];

  /**
   * Generates Chromium command line flags to enable DNS-over-HTTPS.
   */
  public static getDoHCommandLineArgs(providerEndpoint: string): string[] {
    return [
      `--enable-features=DnsOverHttps`,
      `--dns-over-https-templates=${providerEndpoint}`,
    ];
  }
}

