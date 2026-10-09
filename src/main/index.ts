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
  BrowserWindowManager.setMainWindow(mainWindow);

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

import { BrowserWindowManager } from '../browser/window-manager';

function getWindowContext(event: Electron.IpcMainInvokeEvent) {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { viewMgr: viewManager, tabMgr: tabManager, win: mainWindow };
  const all = BrowserWindowManager.getAllInstances();
  const match = all.find((inst) => inst.window.id === win.id);
  if (match) {
    return { viewMgr: match.viewManager, tabMgr: match.tabManager, win: match.window };
  }
  return { viewMgr: viewManager, tabMgr: tabManager, win: mainWindow };
}

function registerIpcHandlers() {
  // Tab handlers
  ipcMain.handle(IPC_CHANNELS.TAB_LIST, async (event) => {
    const { tabMgr } = getWindowContext(event);
    if (!tabMgr) return [];
    return tabMgr.getAllTabs().map((t) => ({
      id: t.id,
      url: t.url,
      title: t.title,
      isLoading: t.isLoading,
      canGoBack: t.canGoBack,
      canGoForward: t.canGoForward,
      profileId: t.profileId,
    }));
  });

  ipcMain.handle(IPC_CHANNELS.TAB_CREATE, async (event, { url, profileId }) => {
    const { viewMgr, tabMgr } = getWindowContext(event);
    if (!viewMgr || !tabMgr) throw new Error('View manager not initialized');

    const activeProf = profileManager.getActiveProfile();
    const targetProfileId = profileId || activeProf.id;
    const newTab = tabMgr.createTab({ url, profileId: targetProfileId });
    const tabView = viewMgr.createView(newTab.id, newTab.url, newTab.profileId);
    viewMgr.switchView(newTab.id);

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

  ipcMain.handle(IPC_CHANNELS.TAB_CLOSE, async (event, { tabId }) => {
    const { viewMgr, tabMgr, win } = getWindowContext(event);
    if (!viewMgr || !tabMgr) return;
    const result = tabMgr.closeTab(tabId);
    viewMgr.closeView(tabId);
    win?.webContents.send(IPC_CHANNELS.TAB_CLOSED, tabId);

    if (result && result.nextActiveTab) {
      viewMgr.switchView(result.nextActiveTab.id);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TAB_SWITCH, async (event, { tabId }) => {
    const { viewMgr, tabMgr } = getWindowContext(event);
    if (!viewMgr || !tabMgr) return;
    tabMgr.switchTab(tabId);
    viewMgr.switchView(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_NAVIGATE, async (event, { tabId, url }) => {
    const { viewMgr, tabMgr } = getWindowContext(event);
    if (!viewMgr || !tabMgr) return;
    tabMgr.updateTab(tabId, { url });
    viewMgr.navigateView(tabId, url);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_GO_BACK, async (event, { tabId }) => {
    const { viewMgr } = getWindowContext(event);
    if (!viewMgr) return;
    viewMgr.goBack(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_GO_FORWARD, async (event, { tabId }) => {
    const { viewMgr } = getWindowContext(event);
    if (!viewMgr) return;
    viewMgr.goForward(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_RELOAD, async (event, { tabId }) => {
    const { viewMgr } = getWindowContext(event);
    if (!viewMgr) return;
    viewMgr.reload(tabId);
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
    BrowserWindowManager.stopProfileWindow(profileId);
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

  // Multi-window profile launcher (Incognition-style)
  ipcMain.handle(IPC_CHANNELS.PROFILE_LAUNCH, async (_event, { profileId }) => {
    const profile = profileManager.getProfile(profileId);
    if (!profile) throw new Error(`Profile ${profileId} not found`);
    BrowserWindowManager.launchProfileWindow(profile);
    return { success: true, profileId };
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_STOP, async (_event, { profileId }) => {
    return BrowserWindowManager.stopProfileWindow(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_GET_RUNNING, async () => {
    return BrowserWindowManager.getRunningProfileIds();
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

  ipcMain.handle(IPC_CHANNELS.VIEW_SET_VISIBILITY, async (event, { visible }) => {
    const { viewMgr } = getWindowContext(event);
    if (!viewMgr) return;
    viewMgr.setViewVisibility(Boolean(visible));
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
