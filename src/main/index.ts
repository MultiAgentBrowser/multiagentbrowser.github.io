import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { IPC_CHANNELS } from '../security/ipc-contracts';
import { AppPaths } from '../platform/paths';
import { getPlatformInfo } from '../platform/platform-info';
import { ProfileManager } from '../profiles/profile-manager';
import { ProfileLock } from '../profiles/profile-lock';
import { verifyFirebaseIdToken } from '../security/firebase-auth-verifier';

// Set secure Chromium command-line switches
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');
app.commandLine.appendSwitch('enable-features', 'NetworkService,NetworkServiceInProcess');

let mainWindow: BrowserWindow | null = null;
let authenticatedUserId: string | null = null;
let authTransition = 0;
const profileManager = new ProfileManager();

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

  BrowserInstanceManager.setMainWindow(mainWindow);
  BrowserInstanceManager.setProfileManager(profileManager);

  const uiPath = path.join(__dirname, '../ui/index.html');
  mainWindow.loadFile(uiPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

import { BrowserWindowManager } from '../browser/window-manager';
import { BrowserInstanceManager } from '../browser/instance-manager';

function requireAuthenticatedUser(): string {
  if (!authenticatedUserId) {
    throw new Error('Sign in before creating or using profiles.');
  }
  return authenticatedUserId;
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.AUTH_SET_USER, async (event, credentials: unknown) => {
    if (event.sender !== mainWindow?.webContents) {
      throw new Error('Only the application window can change the signed-in user.');
    }
    const transition = ++authTransition;
    if (credentials === null) {
      authenticatedUserId = null;
      await Promise.all(
        profileManager.listProfiles().map((profile) => BrowserWindowManager.stopProfileWindow(profile.id))
      );
      return;
    }

    try {
      const verifiedUserId = await verifyFirebaseIdToken(credentials);
      if (transition === authTransition) authenticatedUserId = verifiedUserId;
    } catch (error) {
      if (transition === authTransition) {
        authenticatedUserId = null;
        await Promise.all(
          profileManager.listProfiles().map((profile) => BrowserWindowManager.stopProfileWindow(profile.id))
        );
      }
      throw error;
    }
  });

  // Profile handlers
  ipcMain.handle(IPC_CHANNELS.PROFILE_LIST, async () => {
    return authenticatedUserId ? profileManager.listProfiles() : [];
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_CREATE, async (_event, data) => {
    requireAuthenticatedUser();
    const profile = profileManager.createProfile(data);
    mainWindow?.webContents.send(IPC_CHANNELS.PROFILE_SYNC_CHANGED, { type: 'upsert', profileId: profile.id });
    return profile;
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_UPDATE, async (_event, { profileId, data }) => {
    requireAuthenticatedUser();
    const profile = profileManager.updateProfile(profileId, data);
    mainWindow?.webContents.send(IPC_CHANNELS.PROFILE_SYNC_CHANGED, { type: 'upsert', profileId });
    return profile;
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_DELETE, async (_event, { profileId }) => {
    requireAuthenticatedUser();
    const wasRunning = ProfileLock.isLocked(profileId);
    const stopped = await BrowserWindowManager.stopProfileWindow(profileId);
    if (wasRunning && !stopped) {
      throw new Error(`Could not stop profile before deleting it: ${profileId}`);
    }
    const deleted = profileManager.deleteProfile(profileId);
    if (deleted) {
      mainWindow?.webContents.send(IPC_CHANNELS.PROFILE_SYNC_CHANGED, { type: 'delete', profileId });
    }
    return deleted;
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_DUPLICATE, async (_event, { profileId }) => {
    requireAuthenticatedUser();
    const profile = profileManager.duplicateProfile(profileId);
    mainWindow?.webContents.send(IPC_CHANNELS.PROFILE_SYNC_CHANGED, { type: 'upsert', profileId: profile.id });
    return profile;
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_EXPORT, async (_event, { profileId }) => {
    requireAuthenticatedUser();
    return profileManager.exportProfile(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_IMPORT, async (_event, { jsonContent }) => {
    requireAuthenticatedUser();
    const profile = profileManager.importProfile(jsonContent);
    mainWindow?.webContents.send(IPC_CHANNELS.PROFILE_SYNC_CHANGED, { type: 'upsert', profileId: profile.id });
    return profile;
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_SYNC_REPLACE, async (_event, profiles: unknown[]) => {
    requireAuthenticatedUser();
    return profileManager.replaceSyncedProfiles(profiles);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_SET_ACTIVE, async (_event, { profileId }) => {
    requireAuthenticatedUser();
    return profileManager.setActiveProfile(profileId);
  });

  // Launch each profile in its own Chromium app process and user-data directory.
  ipcMain.handle(IPC_CHANNELS.PROFILE_LAUNCH, async (_event, { profileId }) => {
    requireAuthenticatedUser();
    return BrowserInstanceManager.launchProfile(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_STOP, async (_event, { profileId }) => {
    requireAuthenticatedUser();
    return BrowserWindowManager.stopProfileWindow(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_GET_RUNNING, async () => {
    requireAuthenticatedUser();
    return BrowserWindowManager.getRunningProfileIds();
  });

  // Cookie & Storage IPC handlers
  ipcMain.handle(IPC_CHANNELS.COOKIE_GET, async (_event, { profileId, url }) => {
    requireAuthenticatedUser();
    const { CookieManager } = await import('../privacy/cookies/cookie-manager');
    return CookieManager.getCookies(profileId, url);
  });

  ipcMain.handle(IPC_CHANNELS.COOKIE_DELETE, async (_event, { profileId, url, name }) => {
    requireAuthenticatedUser();
    const { CookieManager } = await import('../privacy/cookies/cookie-manager');
    return CookieManager.deleteCookie(profileId, url, name);
  });

  ipcMain.handle(IPC_CHANNELS.COOKIE_CLEAR_ALL, async (_event, { profileId }) => {
    requireAuthenticatedUser();
    const { CookieManager } = await import('../privacy/cookies/cookie-manager');
    return CookieManager.clearAllCookies(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_CLEAR, async (_event, { profileId, categories }) => {
    requireAuthenticatedUser();
    const { StorageCleaner } = await import('../privacy/cookies/storage-cleaner');
    return StorageCleaner.clearProfileStorage(profileId, categories);
  });

  // Network & Proxy IPC handler
  ipcMain.handle(IPC_CHANNELS.PROXY_TEST, async (_event, { config }) => {
    requireAuthenticatedUser();
    const { ProxyTester } = await import('../network/proxy/proxy-tester');
    return ProxyTester.testConnection(config);
  });

  // Permission IPC handlers
  ipcMain.handle(IPC_CHANNELS.PERMISSION_LIST, async (_event, { profileId }) => {
    requireAuthenticatedUser();
    const { PermissionManager } = await import('../permissions/permission-manager');
    return PermissionManager.listPermissions(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.PERMISSION_SET, async (_event, { profileId, origin, permission, decision }) => {
    requireAuthenticatedUser();
    const { PermissionManager } = await import('../permissions/permission-manager');
    return PermissionManager.setPermission(profileId, origin, permission, decision);
  });

  ipcMain.handle(IPC_CHANNELS.PERMISSION_RESET, async (_event, { profileId }) => {
    requireAuthenticatedUser();
    const { PermissionManager } = await import('../permissions/permission-manager');
    return PermissionManager.resetPermissions(profileId);
  });

}

app.whenReady().then(() => {
  AppPaths.getProfilesDir();
  registerIpcHandlers();
  BrowserInstanceManager.setProfileManager(profileManager);
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
