/**
 * Computes the configured User-Agent string for a browser type, version, and OS.
 */
export function getBrowserUserAgent(
  browserType: 'chrome' | 'edge' | 'brave',
  version: string,
  os: 'mac' | 'windows'
): string {
  const osString = os === 'mac'
    ? 'Macintosh; Intel Mac OS X 10_15_7'
    : 'Windows NT 10.0; Win64; x64';

  const majorVersion = version.split('.')[0] || '150';

  if (browserType === 'edge') {
    return `Mozilla/5.0 (${osString}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVersion}.0.0.0 Safari/537.36 Edg/${version}`;
  }

  // Chrome & Brave both use standard Chrome user-agent string for web compatibility
  return `Mozilla/5.0 (${osString}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
}

export function getEffectiveUserAgent(
  browserType: 'chrome' | 'edge' | 'brave',
  version: string,
  os: 'mac' | 'windows',
  customUserAgent?: string
): string {
  return customUserAgent?.trim() || getBrowserUserAgent(browserType, version, os);
}
