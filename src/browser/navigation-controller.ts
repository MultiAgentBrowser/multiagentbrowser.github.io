export class NavigationController {
  /**
   * Sanitizes and normalizes an input URL string.
   * If the input is a plain search query or lacks a protocol, prepends https://.
   * Restricts dangerous schemes such as file://, javascript:, vbscript:.
   */
  public static sanitizeUrl(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) {
      return 'about:blank';
    }

    if (trimmed === 'about:blank') {
      return 'about:blank';
    }

    // Check for dangerous schemes
    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('vbscript:') ||
      lower.startsWith('data:text/html')
    ) {
      return 'about:blank';
    }

    // Direct domain or protocol check
    const hasProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
    if (hasProtocol) {
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          return parsed.toString();
        }
        if (parsed.protocol === 'chrome:' || parsed.protocol === 'file:') {
          // Disallow arbitrary local file access from address bar
          return 'about:blank';
        }
        return parsed.toString();
      } catch {
        // Fallback to search query
        return this.buildSearchUrl(trimmed);
      }
    }

    // Check if it's a domain name (e.g. example.com, localhost:3000, 127.0.0.1)
    const isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/.test(trimmed) ||
      /^localhost(:\d+)?(\/.*)?$/.test(trimmed) ||
      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/.test(trimmed);

    if (isDomain) {
      return `https://${trimmed}`;
    }

    // Otherwise treat as privacy search query on DuckDuckGo
    return this.buildSearchUrl(trimmed);
  }

  public static buildSearchUrl(query: string): string {
    return `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  }
}

