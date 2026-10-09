import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { IPC_CHANNELS, TabInfo, PrivacyStats } from '../security/ipc-contracts';
import { AppPaths } from '../platform/paths';
import { getPlatformInfo } from '../platform/platform-info';
import { ViewManager } from '../browser/view-manager';
import { TabManager } from '../tabs/tab-manager';
import { ProfileManager } from '../profiles/profile-manager';

// Set secure Chromium command-line switches
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');
app.commandLine.appendSwitch('enable-features', 'NetworkService,NetworkServiceInProcess');

let mainWindow: BrowserWindow | null = null;
let viewManager: ViewManager | null = null;
const profileManager = new ProfileManager();
const tabManager = new TabManager(profileManager.getActiveProfile().id);

function createMainWindow() {
  const platform = getPlatformInfo();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 800,
    minHeight: 600,
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

  viewManager = new ViewManager(mainWindow);

  // Wire up viewManager callbacks to TabManager & UI
  viewManager.setCallbacks(
    (tabInfo: TabInfo) => {
      tabManager.updateTab(tabInfo.id, {
        url: tabInfo.url,
        title: tabInfo.title,
        isLoading: tabInfo.isLoading,
        canGoBack: tabInfo.canGoBack,
        canGoForward: tabInfo.canGoForward,
      });
      mainWindow?.webContents.send(IPC_CHANNELS.TAB_UPDATED, tabInfo);
    },
    (url: string, profileId: string) => {
      const activeProf = profileManager.getActiveProfile();
      const newTab = tabManager.createTab({ url, profileId: profileId || activeProf.id });
      const tabView = viewManager?.createView(newTab.id, url, newTab.profileId);
      if (tabView) {
        viewManager?.switchView(newTab.id);
        mainWindow?.webContents.send(IPC_CHANNELS.TAB_UPDATED, {
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
  );

  const { TrackerBlocker } = require('../privacy/tracker/tracker-blocker');
  const { PrivacyEngine } = require('../privacy/privacy-engine');
  TrackerBlocker.setOnTrackerBlockedCallback((profileId: string) => {
    const stats = PrivacyEngine.getPrivacyStats(profileId, true, false);
    mainWindow?.webContents.send(IPC_CHANNELS.PRIVACY_STATS_UPDATED, stats);
  });

  const uiPath = path.join(__dirname, '../ui/index.html');
  mainWindow.loadFile(uiPath);

  // When UI finishes loading, create the default initial tab
  mainWindow.webContents.once('did-finish-load', () => {
    const activeProf = profileManager.getActiveProfile();
    const initialTab = tabManager.createTab({
      url: 'https://duckduckgo.com',
      profileId: activeProf.id,
    });
    const initialView = viewManager?.createView(
      initialTab.id,
      initialTab.url,
      initialTab.profileId
    );
    if (initialView) {
      viewManager?.switchView(initialTab.id);
      mainWindow?.webContents.send(IPC_CHANNELS.TAB_UPDATED, {
        id: initialTab.id,
        url: initialTab.url,
        title: 'DuckDuckGo — Privacy, simplified.',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        profileId: initialTab.profileId,
      });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    viewManager = null;
  });
}

function registerIpcHandlers() {
  // Tab handlers
  ipcMain.handle(IPC_CHANNELS.TAB_LIST, async () => {
    return tabManager.getAllTabs().map((t) => ({
      id: t.id,
      url: t.url,
      title: t.title,
      isLoading: t.isLoading,
      canGoBack: t.canGoBack,
      canGoForward: t.canGoForward,
      profileId: t.profileId,
    }));
  });

  ipcMain.handle(IPC_CHANNELS.TAB_CREATE, async (_event, { url, profileId }) => {
    if (!viewManager) throw new Error('View manager not initialized');

    const activeProf = profileManager.getActiveProfile();
    const targetProfileId = profileId || activeProf.id;
    const newTab = tabManager.createTab({ url, profileId: targetProfileId });
    const tabView = viewManager.createView(newTab.id, newTab.url, newTab.profileId);
    viewManager.switchView(newTab.id);

    return {
      id: newTab.id,
      url: newTab.url,
      title: newTab.title,
      isLoading: newTab.isLoading,
      canGoBack: newTab.canGoBack,
      canGoForward: newTab.canGoForward,
      profileId: newTab.profileId,
    };
  });

  ipcMain.handle(IPC_CHANNELS.TAB_CLOSE, async (_event, { tabId }) => {
    if (!viewManager) return;
    const result = tabManager.closeTab(tabId);
    viewManager.closeView(tabId);
    mainWindow?.webContents.send(IPC_CHANNELS.TAB_CLOSED, tabId);

    if (result && result.nextActiveTab) {
      viewManager.switchView(result.nextActiveTab.id);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TAB_SWITCH, async (_event, { tabId }) => {
    if (!viewManager) return;
    tabManager.switchTab(tabId);
    viewManager.switchView(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_NAVIGATE, async (_event, { tabId, url }) => {
    if (!viewManager) return;
    tabManager.updateTab(tabId, { url });
    viewManager.navigateView(tabId, url);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_GO_BACK, async (_event, { tabId }) => {
    if (!viewManager) return;
    viewManager.goBack(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_GO_FORWARD, async (_event, { tabId }) => {
    if (!viewManager) return;
    viewManager.goForward(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_RELOAD, async (_event, { tabId }) => {
    if (!viewManager) return;
    viewManager.reload(tabId);
  });

  // Profile handlers
  ipcMain.handle(IPC_CHANNELS.PROFILE_LIST, async () => {
    return profileManager.listProfiles();
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_CREATE, async (_event, data) => {
    return profileManager.createProfile(data);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_UPDATE, async (_event, { profileId, data }) => {
    return profileManager.updateProfile(profileId, data);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_DELETE, async (_event, { profileId }) => {
    return profileManager.deleteProfile(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_DUPLICATE, async (_event, { profileId }) => {
    return profileManager.duplicateProfile(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_EXPORT, async (_event, { profileId }) => {
    return profileManager.exportProfile(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_IMPORT, async (_event, { jsonContent }) => {
    return profileManager.importProfile(jsonContent);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_SET_ACTIVE, async (_event, { profileId }) => {
    return profileManager.setActiveProfile(profileId);
  });

  // Cookie & Storage IPC handlers
  ipcMain.handle(IPC_CHANNELS.COOKIE_GET, async (_event, { profileId, url }) => {
    const { CookieManager } = await import('../privacy/cookies/cookie-manager');
    return CookieManager.getCookies(profileId, url);
  });

  ipcMain.handle(IPC_CHANNELS.COOKIE_DELETE, async (_event, { profileId, url, name }) => {
    const { CookieManager } = await import('../privacy/cookies/cookie-manager');
    return CookieManager.deleteCookie(profileId, url, name);
  });

  ipcMain.handle(IPC_CHANNELS.COOKIE_CLEAR_ALL, async (_event, { profileId }) => {
    const { CookieManager } = await import('../privacy/cookies/cookie-manager');
    return CookieManager.clearAllCookies(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_CLEAR, async (_event, { profileId, categories }) => {
    const { StorageCleaner } = await import('../privacy/cookies/storage-cleaner');
    return StorageCleaner.clearProfileStorage(profileId, categories);
  });

  // Network & Proxy IPC handler
  ipcMain.handle(IPC_CHANNELS.PROXY_TEST, async (_event, { config }) => {
    const { ProxyTester } = await import('../network/proxy/proxy-tester');
    return ProxyTester.testConnection(config);
  });

  // Permission IPC handlers
  ipcMain.handle(IPC_CHANNELS.PERMISSION_LIST, async (_event, { profileId }) => {
    const { PermissionManager } = await import('../permissions/permission-manager');
    return PermissionManager.listPermissions(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.PERMISSION_SET, async (_event, { profileId, origin, permission, decision }) => {
    const { PermissionManager } = await import('../permissions/permission-manager');
    return PermissionManager.setPermission(profileId, origin, permission, decision);
  });

  ipcMain.handle(IPC_CHANNELS.PERMISSION_RESET, async (_event, { profileId }) => {
    const { PermissionManager } = await import('../permissions/permission-manager');
    return PermissionManager.resetPermissions(profileId);
  });

  // Privacy & Stats
  ipcMain.handle(IPC_CHANNELS.PRIVACY_GET_STATS, async (_event, { tabId }) => {
    const { PrivacyEngine } = await import('../privacy/privacy-engine');
    const activeProf = profileManager.getActiveProfile();
    const activeTab = tabId ? tabManager.getTab(tabId) : tabManager.getActiveTab();
    const isHttps = activeTab ? activeTab.url.startsWith('https://') : true;
    const isProxy = activeProf.proxy.enabled;

    return PrivacyEngine.getPrivacyStats(activeProf.id, isHttps, isProxy);
  });

  ipcMain.handle(IPC_CHANNELS.DEVTOOLS_TOGGLE, async (_event, { tabId }) => {
    viewManager?.toggleDevTools(tabId);
  });
}

app.whenReady().then(() => {
  AppPaths.getProfilesDir();
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
