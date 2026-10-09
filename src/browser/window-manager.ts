import { BrowserWindow } from 'electron';
import path from 'path';
import { ViewManager } from './view-manager';
import { TabManager } from '../tabs/tab-manager';
import { ProfileRecord } from '../profiles/profile-model';
import { getPlatformInfo } from '../platform/platform-info';
import { IPC_CHANNELS, TabInfo } from '../security/ipc-contracts';
import { PrivacyEngine } from '../privacy/privacy-engine';
import { TrackerBlocker } from '../privacy/tracker/tracker-blocker';

export interface WindowInstance {
  profileId: string;
  window: BrowserWindow;
  viewManager: ViewManager;
  tabManager: TabManager;
}

export class BrowserWindowManager {
  private static instances: Map<string, WindowInstance> = new Map();
  private static mainWindow: BrowserWindow | null = null;

  public static setMainWindow(win: BrowserWindow) {
    this.mainWindow = win;
  }

  public static getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public static getRunningProfileIds(): string[] {
    return Array.from(this.instances.keys());
  }

  public static getInstance(profileId: string): WindowInstance | undefined {
    return this.instances.get(profileId);
  }

  public static getAllInstances(): WindowInstance[] {
    return Array.from(this.instances.values());
  }

  public static broadcastRunningProfiles(): void {
    const running = this.getRunningProfileIds();
    this.mainWindow?.webContents.send(IPC_CHANNELS.PROFILE_RUNNING_UPDATED, running);
    for (const inst of this.instances.values()) {
      if (!inst.window.isDestroyed()) {
        inst.window.webContents.send(IPC_CHANNELS.PROFILE_RUNNING_UPDATED, running);
      }
    }
  }

  /**
   * Launches an isolated browser window for a specific profile (Incognition-style).
   */
  public static launchProfileWindow(profile: ProfileRecord): BrowserWindow {
    const existing = this.instances.get(profile.id);
    if (existing && !existing.window.isDestroyed()) {
      existing.window.show();
      existing.window.focus();
      return existing.window;
    }

    const platform = getPlatformInfo();
    const window = new BrowserWindow({
      width: 1280,
      height: 840,
      minWidth: 800,
      minHeight: 600,
      title: `Privacy Browser - [${profile.name}]`,
      titleBarStyle: platform.isMac ? 'hiddenInset' : 'default',
      trafficLightPosition: { x: 12, y: 12 },
      backgroundColor: '#121316',
      webPreferences: {
        preload: path.join(__dirname, '../preload/browser-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    });

    const viewManager = new ViewManager(window);
    const tabManager = new TabManager(profile.id);

    const instance: WindowInstance = {
      profileId: profile.id,
      window,
      viewManager,
      tabManager,
    };

    this.instances.set(profile.id, instance);

    viewManager.setCallbacks(
      (tabInfo: TabInfo) => {
        tabManager.updateTab(tabInfo.id, {
          url: tabInfo.url,
          title: tabInfo.title,
          isLoading: tabInfo.isLoading,
          canGoBack: tabInfo.canGoBack,
          canGoForward: tabInfo.canGoForward,
        });
        if (!window.isDestroyed()) {
          window.webContents.send(IPC_CHANNELS.TAB_UPDATED, tabInfo);
        }
      },
      (url: string, pId: string) => {
        const newTab = tabManager.createTab({ url, profileId: pId || profile.id });
        const tabView = viewManager.createView(newTab.id, url, newTab.profileId);
        if (tabView) {
          viewManager.switchView(newTab.id);
          if (!window.isDestroyed()) {
            window.webContents.send(IPC_CHANNELS.TAB_UPDATED, {
              id: newTab.id,
              url: newTab.url,
              title: newTab.title,
              isLoading: newTab.isLoading,
              canGoBack: newTab.canGoBack,
              canGoForward: newTab.canGoForward,
              profileId: newTab.profileId,
            });
          }
        }
      }
    );

    const uiPath = path.join(__dirname, '../ui/index.html');
    window.loadFile(uiPath);

    window.webContents.once('did-finish-load', () => {
      const initialTab = tabManager.createTab({
        url: 'https://duckduckgo.com',
        profileId: profile.id,
      });
      const initialView = viewManager.createView(
        initialTab.id,
        initialTab.url,
        initialTab.profileId
      );
      if (initialView) {
        viewManager.switchView(initialTab.id);
        if (!window.isDestroyed()) {
          window.webContents.send(IPC_CHANNELS.TAB_UPDATED, {
            id: initialTab.id,
            url: initialTab.url,
            title: `DuckDuckGo — [${profile.name}]`,
            isLoading: false,
            canGoBack: false,
            canGoForward: false,
            profileId: initialTab.profileId,
          });
        }
      }
      this.broadcastRunningProfiles();
    });

    window.on('closed', () => {
      this.instances.delete(profile.id);
      this.broadcastRunningProfiles();
    });

    return window;
  }

  public static stopProfileWindow(profileId: string): boolean {
    const inst = this.instances.get(profileId);
    if (inst && !inst.window.isDestroyed()) {
      inst.window.close();
      this.instances.delete(profileId);
      this.broadcastRunningProfiles();
      return true;
    }
    return false;
  }
}

