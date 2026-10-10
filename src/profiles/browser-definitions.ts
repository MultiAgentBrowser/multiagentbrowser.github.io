export interface BrowserOption {
  id: 'chrome' | 'edge' | 'brave';
  name: string;
  versions: string[];
  defaultVersion: string;
}

export const AVAILABLE_BROWSERS: BrowserOption[] = [
  {
    id: 'chrome',
    name: 'Google Chrome',
    versions: [
      '131.0.6778.86',
      '130.0.6723.116',
      '129.0.6668.100',
      '128.0.6613.137',
    ],
    defaultVersion: '131.0.6778.86',
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    versions: [
      '131.0.2903.86',
      '130.0.2849.68',
      '129.0.2792.89',
    ],
    defaultVersion: '131.0.2903.86',
  },
  {
    id: 'brave',
    name: 'Brave Browser',
    versions: [
      '131.1.73.89',
      '130.1.71.114',
      '129.1.70.126',
    ],
    defaultVersion: '131.1.73.89',
  },
];

/**
 * Computes the exact, authentic User-Agent string for a browser type, version, and OS.
 */
export function getBrowserUserAgent(
  browserType: 'chrome' | 'edge' | 'brave',
  version: string,
  os: 'mac' | 'windows'
): string {
  const osString = os === 'mac'
    ? 'Macintosh; Intel Mac OS X 10_15_7'
    : 'Windows NT 10.0; Win64; x64';

  const majorVersion = version.split('.')[0] || '131';

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
