import { Tab, CreateTabOptions } from './tab-model';

export class TabManager {
  private tabs: Tab[] = [];
  private activeTabId: string | null = null;
  private defaultProfileId: string = 'default';

  constructor(defaultProfileId = 'default') {
    this.defaultProfileId = defaultProfileId;
  }

  public createTab(options: CreateTabOptions = {}): Tab {
    const tabId = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const newTab: Tab = {
      id: tabId,
      url: options.url || 'https://www.google.com',
      title: 'New Tab',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      profileId: options.profileId || this.defaultProfileId,
      isPinned: false,
      createdAt: now,
      lastAccessedAt: now,
    };

    this.tabs.push(newTab);

    if (options.activate !== false || !this.activeTabId) {
      this.activeTabId = newTab.id;
    }

    return newTab;
  }

  public closeTab(tabId: string): { closedTab: Tab; nextActiveTab: Tab | null } | null {
    const index = this.tabs.findIndex((t) => t.id === tabId);
    if (index === -1) return null;

    const [closedTab] = this.tabs.splice(index, 1);
    let nextActiveTab: Tab | null = null;

    if (this.activeTabId === tabId) {
      if (this.tabs.length > 0) {
        // Switch to the adjacent tab (preferred: right, fallback: left)
        const nextIndex = Math.min(index, this.tabs.length - 1);
        nextActiveTab = this.tabs[nextIndex];
        this.activeTabId = nextActiveTab.id;
        nextActiveTab.lastAccessedAt = Date.now();
      } else {
        this.activeTabId = null;
      }
    } else {
      nextActiveTab = this.getActiveTab();
    }

    return { closedTab, nextActiveTab };
  }

  public switchTab(tabId: string): Tab | null {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return null;

    this.activeTabId = tab.id;
    tab.lastAccessedAt = Date.now();
    return tab;
  }

  public getTab(tabId: string): Tab | undefined {
    return this.tabs.find((t) => t.id === tabId);
  }

  public getActiveTab(): Tab | null {
    if (!this.activeTabId) return null;
    return this.tabs.find((t) => t.id === this.activeTabId) || null;
  }

  public getAllTabs(): Tab[] {
    return [...this.tabs];
  }

  public updateTab(tabId: string, updates: Partial<Tab>): Tab | undefined {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return undefined;

    Object.assign(tab, updates);
    return tab;
  }

  public reorderTab(tabId: string, newIndex: number): boolean {
    const currentIndex = this.tabs.findIndex((t) => t.id === tabId);
    if (currentIndex === -1) return false;
    if (newIndex < 0 || newIndex >= this.tabs.length) return false;

    const [movedTab] = this.tabs.splice(currentIndex, 1);
    this.tabs.splice(newIndex, 0, movedTab);
    return true;
  }

  public duplicateTab(tabId: string): Tab | null {
    const sourceTab = this.tabs.find((t) => t.id === tabId);
    if (!sourceTab) return null;

    return this.createTab({
      url: sourceTab.url,
      profileId: sourceTab.profileId,
      activate: true,
    });
  }

  public pinTab(tabId: string, pinned = true): Tab | null {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return null;

    tab.isPinned = pinned;
    return tab;
  }

  public getTabCount(): number {
    return this.tabs.length;
  }
}

