import { describe, it, expect } from 'vitest';
import { BlocklistStore } from '../../src/privacy/tracker/blocklist-store';
import { TrackerBlocker } from '../../src/privacy/tracker/tracker-blocker';

describe('Tracker Blocker Engine & Site Exceptions', () => {
  it('identifies exact and subdomain matches for known trackers', () => {
    expect(BlocklistStore.isTrackerDomain('google-analytics.com')).toBe(true);
    expect(BlocklistStore.isTrackerDomain('ssl.google-analytics.com')).toBe(true);
    expect(BlocklistStore.isTrackerDomain('stats.sub.google-analytics.com')).toBe(true);
    expect(BlocklistStore.isTrackerDomain('connect.facebook.net')).toBe(true);
    expect(BlocklistStore.isTrackerDomain('static.criteo.net')).toBe(true);
    expect(BlocklistStore.isTrackerDomain('in.hotjar.com')).toBe(true);
  });

  it('permits legitimate first-party non-tracker domains', () => {
    expect(BlocklistStore.isTrackerDomain('duckduckgo.com')).toBe(false);
    expect(BlocklistStore.isTrackerDomain('en.wikipedia.org')).toBe(false);
    expect(BlocklistStore.isTrackerDomain('github.com')).toBe(false);
    expect(BlocklistStore.isTrackerDomain('api.github.com')).toBe(false);
  });

  it('correctly decides whether to block incoming requests', () => {
    const firstParty = 'https://news-site.org/article';
    const trackerRequest = 'https://secure.adnxs.com/seg?add=1';
    const legitimateRequest = 'https://news-site.org/assets/logo.png';

    expect(TrackerBlocker.shouldBlockRequest(trackerRequest, firstParty)).toBe(true);
    expect(TrackerBlocker.shouldBlockRequest(legitimateRequest, firstParty)).toBe(false);
  });

  it('respects per-site exception bypass rules', () => {
    const firstPartySite = 'https://partner-portal.com/dashboard';
    const trackerUrl = 'https://www.google-analytics.com/analytics.js';

    // Normal behavior: tracker is blocked
    expect(TrackerBlocker.shouldBlockRequest(trackerUrl, firstPartySite)).toBe(true);

    // Add exception for partner-portal.com
    TrackerBlocker.addSiteException('partner-portal.com');
    expect(TrackerBlocker.hasSiteException('partner-portal.com')).toBe(true);

    // With exception active, request is allowed through
    expect(TrackerBlocker.shouldBlockRequest(trackerUrl, firstPartySite)).toBe(false);

    // Remove exception, blocking resumes
    TrackerBlocker.removeSiteException('partner-portal.com');
    expect(TrackerBlocker.hasSiteException('partner-portal.com')).toBe(false);
    expect(TrackerBlocker.shouldBlockRequest(trackerUrl, firstPartySite)).toBe(true);
  });
});

