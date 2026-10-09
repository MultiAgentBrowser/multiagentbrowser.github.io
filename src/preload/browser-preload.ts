import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, TabInfo, Profile, PrivacyStats } from '../security/ipc-contracts';

const browserAPI = {
  // Tab Management
  createTab: (url?: string, profileId?: string): Promise<TabInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.TAB_CREATE, { url, profileId }),
  closeTab: (tabId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.TAB_CLOSE, { tabId }),
  switchTab: (tabId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.TAB_SWITCH, { tabId }),
  navigateTab: (tabId: string, url: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.TAB_NAVIGATE, { tabId, url }),
  goBack: (tabId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.TAB_GO_BACK, { tabId }),
  goForward: (tabId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.TAB_GO_FORWARD, { tabId }),
  reloadTab: (tabId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.TAB_RELOAD, { tabId }),
  listTabs: (): Promise<TabInfo[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.TAB_LIST),

  // Profile Management
  listProfiles: (): Promise<Profile[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_LIST),
  createProfile: (data: { name: string; isTemporary?: boolean; privacyLevel?: string; color?: string }): Promise<Profile> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_CREATE, data),
  updateProfile: (profileId: string, data: any): Promise<Profile> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_UPDATE, { profileId, data }),
  deleteProfile: (profileId: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_DELETE, { profileId }),
  duplicateProfile: (profileId: string): Promise<Profile> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_DUPLICATE, { profileId }),
  exportProfile: (profileId: string): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_EXPORT, { profileId }),
  importProfile: (jsonContent: string): Promise<Profile> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_IMPORT, { jsonContent }),
  setActiveProfile: (profileId: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_SET_ACTIVE, { profileId }),

  // Cookie & Storage Management
  getCookies: (profileId: string, url?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.COOKIE_GET, { profileId, url }),
  deleteCookie: (profileId: string, url: string, name: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.COOKIE_DELETE, { profileId, url, name }),
  clearAllCookies: (profileId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.COOKIE_CLEAR_ALL, { profileId }),
  clearStorage: (profileId: string, categories?: string[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.STORAGE_CLEAR, { profileId, categories }),

  // Network & Proxy
  testProxy: (config: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROXY_TEST, { config }),

  // Permissions
  listPermissions: (profileId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PERMISSION_LIST, { profileId }),
  setPermission: (profileId: string, origin: string, permission: string, decision: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PERMISSION_SET, { profileId, origin, permission, decision }),
  resetPermissions: (profileId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PERMISSION_RESET, { profileId }),

  // Privacy & Stats
  getPrivacyStats: (tabId?: string): Promise<PrivacyStats> =>
    ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_GET_STATS, { tabId }),

  // DevTools
  toggleDevTools: (tabId?: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.DEVTOOLS_TOGGLE, { tabId }),

  // Event Listeners
  onTabUpdated: (callback: (tab: TabInfo) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, tab: TabInfo) => callback(tab);
    ipcRenderer.on(IPC_CHANNELS.TAB_UPDATED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TAB_UPDATED, handler);
  },
  onTabClosed: (callback: (tabId: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, tabId: string) => callback(tabId);
    ipcRenderer.on(IPC_CHANNELS.TAB_CLOSED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TAB_CLOSED, handler);
  },
  onPrivacyStatsUpdated: (callback: (stats: PrivacyStats) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, stats: PrivacyStats) => callback(stats);
    ipcRenderer.on(IPC_CHANNELS.PRIVACY_STATS_UPDATED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.PRIVACY_STATS_UPDATED, handler);
  },
};

export type BrowserAPI = typeof browserAPI;

contextBridge.exposeInMainWorld('browserAPI', browserAPI);
