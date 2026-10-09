import { contextBridge, ipcRenderer } from 'electron';
import type { TabInfo, Profile, PrivacyStats } from '../security/ipc-contracts';

const IPC_CHANNELS = {
  // Tabs
  TAB_CREATE: 'tab:create',
  TAB_CLOSE: 'tab:close',
  TAB_SWITCH: 'tab:switch',
  TAB_NAVIGATE: 'tab:navigate',
  TAB_GO_BACK: 'tab:go-back',
  TAB_GO_FORWARD: 'tab:go-forward',
  TAB_RELOAD: 'tab:reload',
  TAB_LIST: 'tab:list',
  
  // Tab Events
  TAB_UPDATED: 'tab:updated',
  TAB_CLOSED: 'tab:closed',

  // Profiles
  PROFILE_LIST: 'profile:list',
  PROFILE_CREATE: 'profile:create',
  PROFILE_UPDATE: 'profile:update',
  PROFILE_DELETE: 'profile:delete',
  PROFILE_DUPLICATE: 'profile:duplicate',
  PROFILE_EXPORT: 'profile:export',
  PROFILE_IMPORT: 'profile:import',
  PROFILE_SET_ACTIVE: 'profile:set-active',
  PROFILE_LAUNCH: 'profile:launch',
  PROFILE_STOP: 'profile:stop',
  PROFILE_GET_RUNNING: 'profile:get-running',
  PROFILE_RUNNING_UPDATED: 'profile:running-updated',

  // Cookies & Storage
  COOKIE_GET: 'cookie:get',
  COOKIE_DELETE: 'cookie:delete',
  COOKIE_CLEAR_ALL: 'cookie:clear-all',
  STORAGE_CLEAR: 'storage:clear',

  // Network & Proxy
  PROXY_TEST: 'proxy:test',

  // Permissions
  PERMISSION_LIST: 'permission:list',
  PERMISSION_SET: 'permission:set',
  PERMISSION_RESET: 'permission:reset',

  // Privacy & Stats
  PRIVACY_GET_STATS: 'privacy:get-stats',
  PRIVACY_STATS_UPDATED: 'privacy:stats-updated',

  // DevTools
  DEVTOOLS_TOGGLE: 'devtools:toggle',
} as const;

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
  launchProfile: (profileId: string): Promise<{ success: boolean; profileId: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_LAUNCH, { profileId }),
  stopProfile: (profileId: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_STOP, { profileId }),
  getRunningProfiles: (): Promise<string[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET_RUNNING),

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
  onRunningProfilesUpdated: (callback: (runningIds: string[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, runningIds: string[]) => callback(runningIds);
    ipcRenderer.on(IPC_CHANNELS.PROFILE_RUNNING_UPDATED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.PROFILE_RUNNING_UPDATED, handler);
  },
};

export type BrowserAPI = typeof browserAPI;

contextBridge.exposeInMainWorld('browserAPI', browserAPI);
