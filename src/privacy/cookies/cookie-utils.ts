export class CookieUtils {
  /**
   * Extracts the base registrable domain (eTLD+1 heuristic) from a hostname.
   * e.g. "sub.example.com" -> "example.com"
   * "tracker.analytics.co.uk" -> "analytics.co.uk"
   * "localhost" -> "localhost"
   */
  public static getBaseDomain(hostname: string): string {
    if (!hostname) return '';
    const cleanHost = hostname.toLowerCase().split(':')[0];

    // IP address check
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanHost) || cleanHost === 'localhost') {
      return cleanHost;
    }

    const parts = cleanHost.split('.');
    if (parts.length <= 2) {
      return cleanHost;
    }

    // Common two-level TLDs (co.uk, com.au, co.jp, etc.)
    const twoLevelTlds = ['co.uk', 'gov.uk', 'ac.uk', 'com.au', 'net.au', 'co.jp', 'com.br', 'co.nz'];
    const lastTwo = parts.slice(-2).join('.');

    if (twoLevelTlds.includes(lastTwo) && parts.length >= 3) {
      return parts.slice(-3).join('.');
    }

    return parts.slice(-2).join('.');
  }

  /**
   * Determines if a request target URL is third-party relative to the first-party document URL.
   */
  public static isThirdParty(firstPartyUrl: string, requestUrl: string): boolean {
    if (!firstPartyUrl || !requestUrl) return false;

    try {
      const firstPartyHost = new URL(firstPartyUrl).hostname;
      const requestHost = new URL(requestUrl).hostname;

      if (!firstPartyHost || !requestHost) return false;

      const firstPartyBase = this.getBaseDomain(firstPartyHost);
      const requestBase = this.getBaseDomain(requestHost);

      return firstPartyBase !== requestBase;
    } catch {
      return false;
    }
  }
}

