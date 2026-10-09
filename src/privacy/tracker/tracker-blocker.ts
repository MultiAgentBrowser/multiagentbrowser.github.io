import { Session } from 'electron';
import { BlocklistStore } from './blocklist-store';
import { PrivacyEngine } from '../privacy-engine';
import { CookieUtils } from '../cookies/cookie-utils';

export class TrackerBlocker {
  // Per-site allowlist of domains where tracking protection is bypassed by user request
  private static siteExceptions: Set<string> = new Set();
  private static onTrackerBlockedCallback?: (profileId: string, blockedUrl: string) => void;

  public static setOnTrackerBlockedCallback(cb: (profileId: string, blockedUrl: string) => void) {
    this.onTrackerBlockedCallback = cb;
  }

  /**
   * Adds a first-party site exception where tracker blocking is disabled.
   */
  public static addSiteException(hostname: string): void {
    const base = CookieUtils.getBaseDomain(hostname);
    if (base) this.siteExceptions.add(base.toLowerCase());
  }

  /**
   * Removes a site exception.
   */
  public static removeSiteException(hostname: string): void {
    const base = CookieUtils.getBaseDomain(hostname);
    if (base) this.siteExceptions.delete(base.toLowerCase());
  }

  /**
   * Checks if a first-party site has an exception.
   */
  public static hasSiteException(hostname: string): boolean {
    const base = CookieUtils.getBaseDomain(hostname);
    return base ? this.siteExceptions.has(base.toLowerCase()) : false;
  }

  /**
   * Determines whether an HTTP request should be blocked.
   */
  public static shouldBlockRequest(requestUrl: string, firstPartyUrl: string): boolean {
    if (!requestUrl) return false;

    // Check if current site is in user's exception list
    if (firstPartyUrl) {
      try {
        const firstPartyHost = new URL(firstPartyUrl).hostname;
        if (this.hasSiteException(firstPartyHost)) {
          return false;
        }
      } catch {}
    }

    try {
      const parsed = new URL(requestUrl);
      const host = parsed.hostname;
      return BlocklistStore.isTrackerDomain(host);
    } catch {
      return false;
    }
  }

  /**
   * Attaches onBeforeRequest blocking filter to a profile session.
   */
  public static attachTrackerBlocking(targetSession: Session, profileId: string): void {
    targetSession.webRequest.onBeforeRequest(
      { urls: ['*://*/*'] },
      (details, callback) => {
        const { url, frame } = details;
        const firstPartyUrl = frame?.url || details.webContents?.getURL() || '';

        if (this.shouldBlockRequest(url, firstPartyUrl)) {
          PrivacyEngine.recordTrackerBlocked(profileId);
          if (this.onTrackerBlockedCallback) {
            this.onTrackerBlockedCallback(profileId, url);
          }
          return callback({ cancel: true });
        }

        callback({ cancel: false });
      }
    );
  }
}

