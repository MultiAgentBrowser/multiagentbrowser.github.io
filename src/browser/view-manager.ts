import { WebContentsView, BrowserWindow, session } from 'electron';
import { ViewLayout } from './view-layout';
import { NavigationController } from './navigation-controller';
import { IPC_CHANNELS, TabInfo } from '../security/ipc-contracts';
import path from 'path';
import { getProfileFingerprintSeed } from '../privacy/fingerprint/profile-fingerprint';

export interface TabView {
  tabId: string;
  view: WebContentsView;
  profileId: string;
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export class ViewManager {
  private window: BrowserWindow;
  private views: Map<string, TabView> = new Map();
  private activeTabId: string | null = null;
  private onTabUpdatedCallback?: (tab: TabInfo) => void;
  private onOpenNewTabRequested?: (url: string, profileId: string) => void;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.bindWindowEvents();
  }

  public setCallbacks(
    onTabUpdated: (tab: TabInfo) => void,
    onOpenNewTab: (url: string, profileId: string) => void
  ) {
    this.onTabUpdatedCallback = onTabUpdated;
    this.onOpenNewTabRequested = onOpenNewTab;
  }

  private isViewVisible: boolean = true;

  private bindWindowEvents(): void {
    const update = () => this.updateActiveViewBounds();
    this.window.on('resize', update);
    this.window.on('maximize', update);
    this.window.on('unmaximize', update);
    this.window.on('enter-full-screen', update);
    this.window.on('leave-full-screen', update);
  }

  public setViewVisibility(visible: boolean): void {
    this.isViewVisible = visible;
    if (!this.activeTabId) return;
    const active = this.views.get(this.activeTabId);
    if (!active) return;

    if (visible) {
      if (!this.window.contentView.children.includes(active.view)) {
        this.window.contentView.addChildView(active.view);
      }
      this.updateActiveViewBounds();
    } else {
      if (this.window.contentView.children.includes(active.view)) {
        this.window.contentView.removeChildView(active.view);
      }
    }
  }

  public updateActiveViewBounds(): void {
    if (!this.activeTabId || !this.isViewVisible) return;
    const active = this.views.get(this.activeTabId);
    if (!active) return;

    const [width, height] = this.window.getContentSize();
    const bounds = ViewLayout.calculateViewportBounds(width, height);
    active.view.setBounds(bounds);
  }

  /**
   * Creates a new WebContentsView attached to a specific profile partition.
   */
  public createView(tabId: string, initialUrl: string, profileId: string): TabView {
    const partitionName = `persist:${profileId}`;
    const customSession = session.fromPartition(partitionName);

    // Apply partition-level cookie protection
    const { CookieManager } = require('../privacy/cookies/cookie-manager');
    CookieManager.configureSessionCookieProtection(customSession, profileId, true);

    // Apply WebRTC & Proxy configurations
    const { WebRTCController } = require('../privacy/webrtc/webrtc-controller');
    const { ProxyManager } = require('../network/proxy/proxy-manager');
    const { TrackerBlocker } = require('../privacy/tracker/tracker-blocker');
    const { PermissionManager } = require('../permissions/permission-manager');
    const { ProfileStorage } = require('../profiles/profile-storage');
    const profiles = ProfileStorage.loadProfilesManifest();
    const currentProfile = profiles.find((p: any) => p.id === profileId);
    const fingerprintSeed = getProfileFingerprintSeed(profileId);

    // Attach real-time tracker blocking & permission controls
    TrackerBlocker.attachTrackerBlocking(customSession, profileId);
    PermissionManager.attachPermissionHandlers(customSession, profileId);

    const { getEffectiveUserAgent } = require('../profiles/browser-definitions');

    if (currentProfile) {
      const browserType = currentProfile.browserType || 'chrome';
      const browserVersion = currentProfile.browserVersion || '150.0.0.0';
      const os = currentProfile.os || 'mac';
      const userAgent = getEffectiveUserAgent(
        browserType,
        browserVersion,
        os,
        currentProfile.customUserAgent
      );
      customSession.setUserAgent(userAgent);

      WebRTCController.applyWebRTCPolicy(customSession, currentProfile.webrtcPolicy || 'default_public_interface_only');
      if (currentProfile.proxy) {
        ProxyManager.applyProxyConfig(customSession, currentProfile.proxy);
      }
    } else {
      WebRTCController.applyWebRTCPolicy(customSession, 'default_public_interface_only');
    }

    // Hardened webPreferences for untrusted web content
    const view = new WebContentsView({
      webPreferences: {
        session: customSession,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        preload: path.join(__dirname, '../preload/page-preload.js'),
        additionalArguments: [`--profile-fingerprint-seed=${fingerprintSeed}`],
      },
    });

    const tabView: TabView = {
      tabId,
      view,
      profileId,
      url: initialUrl,
      title: 'New Tab',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
    };

    this.views.set(tabId, tabView);
    this.setupViewSecurityAndEvents(tabView);

    // Initial navigation
    const sanitizedUrl = NavigationController.sanitizeUrl(initialUrl);
    if (sanitizedUrl && sanitizedUrl !== 'about:blank') {
      view.webContents.loadURL(sanitizedUrl).catch(() => {
        // Handled via did-fail-load event
      });
    }

    return tabView;
  }

  private setupViewSecurityAndEvents(tabView: TabView): void {
    const wc = tabView.view.webContents;

    // Security: Block unauthorized popups, route window.open to new browser tabs
    wc.setWindowOpenHandler((details) => {
      if (this.onOpenNewTabRequested) {
        this.onOpenNewTabRequested(details.url, tabView.profileId);
      }
      return { action: 'deny' };
    });

    // Security: Intercept and guard navigations
    wc.on('will-navigate', (event, url) => {
      if (url.startsWith('file:') || url.startsWith('javascript:')) {
        event.preventDefault();
      }
    });

    // Lifecycle events
    wc.on('did-start-loading', () => {
      tabView.isLoading = true;
      this.notifyTabUpdated(tabView);
    });

    wc.on('did-stop-loading', () => {
      tabView.isLoading = false;
      tabView.canGoBack = wc.canGoBack();
      tabView.canGoForward = wc.canGoForward();
      this.notifyTabUpdated(tabView);
    });

    wc.on('did-navigate', (_event, url) => {
      tabView.url = url;
      tabView.canGoBack = wc.canGoBack();
      tabView.canGoForward = wc.canGoForward();
      this.notifyTabUpdated(tabView);
    });

    wc.on('did-navigate-in-page', (_event, url) => {
      tabView.url = url;
      tabView.canGoBack = wc.canGoBack();
      tabView.canGoForward = wc.canGoForward();
      this.notifyTabUpdated(tabView);
    });

    wc.on('page-title-updated', (_event, title) => {
      tabView.title = title;
      this.notifyTabUpdated(tabView);
    });
  }

  private notifyTabUpdated(tabView: TabView): void {
    const tabInfo: TabInfo = {
      id: tabView.tabId,
      url: tabView.url,
      title: tabView.title,
      isLoading: tabView.isLoading,
      canGoBack: tabView.canGoBack,
      canGoForward: tabView.canGoForward,
      profileId: tabView.profileId,
    };

    if (this.onTabUpdatedCallback) {
      this.onTabUpdatedCallback(tabInfo);
    }
  }

  /**
   * Switches the active viewport view.
   */
  public switchView(tabId: string): void {
    if (this.activeTabId === tabId) return;

    // Detach current view from contentView
    if (this.activeTabId) {
      const prev = this.views.get(this.activeTabId);
      if (prev) {
        this.window.contentView.removeChildView(prev.view);
      }
    }

    // Attach new view to contentView if visible
    const next = this.views.get(tabId);
    if (next) {
      this.activeTabId = tabId;
      if (this.isViewVisible) {
        this.window.contentView.addChildView(next.view);
        this.updateActiveViewBounds();
      }
    }
  }

  /**
   * Navigates the given tab's view.
   */
  public navigateView(tabId: string, inputUrl: string): void {
    const tabView = this.views.get(tabId);
    if (!tabView) return;

    const targetUrl = NavigationController.sanitizeUrl(inputUrl);
    tabView.url = targetUrl;
    tabView.view.webContents.loadURL(targetUrl).catch(() => {});
  }

  public goBack(tabId: string): void {
    const tabView = this.views.get(tabId);
    if (tabView && tabView.view.webContents.canGoBack()) {
      tabView.view.webContents.goBack();
    }
  }

  public goForward(tabId: string): void {
    const tabView = this.views.get(tabId);
    if (tabView && tabView.view.webContents.canGoForward()) {
      tabView.view.webContents.goForward();
    }
  }

  public reload(tabId: string): void {
    const tabView = this.views.get(tabId);
    if (tabView) {
      tabView.view.webContents.reload();
    }
  }

  public closeView(tabId: string): void {
    const tabView = this.views.get(tabId);
    if (!tabView) return;

    if (this.activeTabId === tabId) {
      this.window.contentView.removeChildView(tabView.view);
      this.activeTabId = null;
    }

    // Destroy webcontents
    (tabView.view.webContents as any).destroy?.();
    this.views.delete(tabId);
  }

  public getTabView(tabId: string): TabView | undefined {
    return this.views.get(tabId);
  }

  public getAllTabViews(): TabView[] {
    return Array.from(this.views.values());
  }

  public toggleDevTools(tabId?: string): void {
    const targetId = tabId || this.activeTabId;
    if (!targetId) return;
    const tabView = this.views.get(targetId);
    if (tabView) {
      tabView.view.webContents.toggleDevTools();
    }
  }
}
