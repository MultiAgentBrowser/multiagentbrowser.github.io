import { describe, it, expect } from 'vitest';
import { ProxyManager } from '../../src/network/proxy/proxy-manager';
import { DNSConfig } from '../../src/network/dns/dns-config';
import { ProxyConfig } from '../../src/security/ipc-contracts';

describe('Network Privacy, Proxy & DNS Configurations', () => {
  it('translates direct proxy modes accurately', () => {
    const directConfig: ProxyConfig = {
      enabled: false,
      mode: 'direct',
      host: '',
      port: 8080,
    };
    expect(ProxyManager.buildProxyRules(directConfig)).toBe('direct://');
  });

  it('translates SOCKS5 proxy configuration correctly', () => {
    const socksConfig: ProxyConfig = {
      enabled: true,
      mode: 'socks5',
      host: '127.0.0.1',
      port: 9050,
    };
    expect(ProxyManager.buildProxyRules(socksConfig)).toBe('socks5://127.0.0.1:9050');
  });

  it('translates HTTP and HTTPS proxy configurations correctly', () => {
    const httpConfig: ProxyConfig = {
      enabled: true,
      mode: 'http',
      host: 'proxy.internal',
      port: 3128,
    };
    expect(ProxyManager.buildProxyRules(httpConfig)).toBe('http://proxy.internal:3128');

    const httpsConfig: ProxyConfig = {
      enabled: true,
      mode: 'https',
      host: 'secure.proxy.com',
      port: 8443,
    };
    expect(ProxyManager.buildProxyRules(httpsConfig)).toBe('https://secure.proxy.com:8443');
  });

  it('provides validated DNS-over-HTTPS providers', () => {
    expect(DNSConfig.DOH_PROVIDERS.length).toBeGreaterThanOrEqual(2);
    const cloudflare = DNSConfig.DOH_PROVIDERS.find((p) => p.id === 'cloudflare');
    expect(cloudflare).toBeDefined();
    expect(cloudflare?.endpoint).toBe('https://cloudflare-dns.com/dns-query');

    const args = DNSConfig.getDoHCommandLineArgs(cloudflare!.endpoint);
    expect(args[0]).toBe('--enable-features=DnsOverHttps');
    expect(args[1]).toContain(cloudflare!.endpoint);
  });
});

