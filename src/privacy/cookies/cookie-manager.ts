import { session, Session } from 'electron';
import { CookieUtils } from './cookie-utils';

export interface CookieInfo {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  expirationDate?: number;
}

export class CookieManager {
  private static blockedCookiesCount: Map<string, number> = new Map();

  /**
   * Configures third-party cookie blocking for a given profile session.
   */
  public static configureSessionCookieProtection(
    customSession: Session,
    profileId: string,
    blockThirdParty: boolean = true
  ): void {
    if (!blockThirdParty) return;

    // Filter outbound third-party Cookie headers
    customSession.webRequest.onBeforeSendHeaders(
      { urls: ['*://*/*'] },
      (details, callback) => {
        const { requestHeaders, url, frame } = details;
        const firstPartyUrl = frame?.url || details.webContents?.getURL() || '';

        if (firstPartyUrl && CookieUtils.isThirdParty(firstPartyUrl, url)) {
          if (requestHeaders['Cookie']) {
            delete requestHeaders['Cookie'];
            this.incrementBlockedCount(profileId);
          }
        }

        callback({ requestHeaders });
      }
    );

    // Filter inbound third-party Set-Cookie headers
    customSession.webRequest.onHeadersReceived(
      { urls: ['*://*/*'] },
      (details, callback) => {
        const { responseHeaders, url, frame } = details;
        const firstPartyUrl = frame?.url || details.webContents?.getURL() || '';

        if (responseHeaders && firstPartyUrl && CookieUtils.isThirdParty(firstPartyUrl, url)) {
          const setCookieKey = Object.keys(responseHeaders).find(
            (k) => k.toLowerCase() === 'set-cookie'
          );

          if (setCookieKey && responseHeaders[setCookieKey]) {
            delete responseHeaders[setCookieKey];
            this.incrementBlockedCount(profileId);
          }
        }

        callback({ responseHeaders });
      }
    );
  }

  private static incrementBlockedCount(profileId: string): void {
    const current = this.blockedCookiesCount.get(profileId) || 0;
    this.blockedCookiesCount.set(profileId, current + 1);
  }

  public static getBlockedCount(profileId: string): number {
    return this.blockedCookiesCount.get(profileId) || 0;
  }

  public static resetBlockedCount(profileId: string): void {
    this.blockedCookiesCount.set(profileId, 0);
  }

  /**
   * Retrieves all cookies for a specific profile session.
   */
  public static async getCookies(profileId: string, urlFilter?: string): Promise<CookieInfo[]> {
    const targetSession = session.fromPartition(`persist:${profileId}`);
    const filter = urlFilter ? { url: urlFilter } : {};
    const cookies = await targetSession.cookies.get(filter);

    return cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain || '',
      path: c.path || '/',
      secure: c.secure ?? false,
      httpOnly: c.httpOnly ?? false,
      expirationDate: c.expirationDate,
    }));
  }

  /**
   * Deletes a specific cookie from a profile session.
   */
  public static async deleteCookie(profileId: string, url: string, name: string): Promise<boolean> {
    const targetSession = session.fromPartition(`persist:${profileId}`);
    try {
      await targetSession.cookies.remove(url, name);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears all cookies for a profile session.
   */
  public static async clearAllCookies(profileId: string): Promise<void> {
    const targetSession = session.fromPartition(`persist:${profileId}`);
    await targetSession.clearStorageData({ storages: ['cookies'] });
  }
}
