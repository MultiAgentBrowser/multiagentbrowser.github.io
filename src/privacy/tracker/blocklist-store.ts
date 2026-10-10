export class BlocklistStore {
  /**
   * Primary compiled database of known tracking, analytics, and fingerprinting domains.
   */
  private static readonly TRACKER_DOMAINS = new Set<string>([
    // Google Analytics & Ad Services
    'google-analytics.com',
    'googletagmanager.com',
    'doubleclick.net',
    'googlesyndication.com',
    'googleadservices.com',
    '2mdn.net',

    // Meta / Facebook Tracking
    'connect.facebook.net',
    'pixel.facebook.com',
    'an.facebook.com',

    // Cross-site Trackers & Ad Exchanges
    'criteo.com',
    'criteo.net',
    'adnxs.com',
    'rubiconproject.com',
    'pubmatic.com',
    'openx.net',
    'casalemedia.com',
    'advertising.com',
    'taboola.com',
    'outbrain.com',
    'quantserve.com',
    'scorecardresearch.com',
    'bluekai.com',

    // Behavioral & Session Recording / Fingerprinting
    'hotjar.com',
    'clarity.ms',
    'crazyegg.com',
    'fullstory.com',
    'mouseflow.com',
    'inspectlet.com',
    'luckyorange.com',
    'logentries.com',
    'fingerprintjs.com',
    'fpnpmcdn.net',
    'fpjs.io',
    'fingerprint.com',

    // Product Analytics & Telemetry
    'segment.io',
    'segment.com',
    'mixpanel.com',
    'amplitude.com',
    'branch.io',
    'appsflyer.com',
    'adjust.com',
    'braze.com',
    'optimizely.com',
    'heapanalytics.com',
    'kissmetrics.com',

    // Telemetry & Data Brokers
    'newrelic.com',
    'nr-data.net',
    'datadoghq-browser-agent.com',
    'bugsnag.com',
    'sentry.io/api/embed',
  ]);

  public static getDomains(): Set<string> {
    return this.TRACKER_DOMAINS;
  }

  public static isTrackerDomain(hostname: string): boolean {
    if (!hostname) return false;
    const cleanHost = hostname.toLowerCase().split(':')[0];

    // Check exact domain
    if (this.TRACKER_DOMAINS.has(cleanHost)) {
      return true;
    }

    // Check parent domains (e.g. ads.google-analytics.com -> google-analytics.com)
    const parts = cleanHost.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
      const parentDomain = parts.slice(i).join('.');
      if (this.TRACKER_DOMAINS.has(parentDomain)) {
        return true;
      }
    }

    return false;
  }
}
