import { describe, it, expect, beforeEach } from 'vitest';
import { TabManager } from '../../src/tabs/tab-manager';

describe('TabManager Domain Logic', () => {
  let manager: TabManager;

  beforeEach(() => {
    manager = new TabManager('default');
  });

  it('creates tabs with default privacy properties', () => {
    const tab = manager.createTab({ url: 'https://example.com' });
    expect(tab.id).toBeDefined();
    expect(tab.url).toBe('https://example.com');
    expect(tab.profileId).toBe('default');
    expect(manager.getActiveTab()?.id).toBe(tab.id);
    expect(manager.getTabCount()).toBe(1);
  });

  it('switches between tabs accurately', () => {
    const tab1 = manager.createTab({ url: 'https://site1.com' });
    const tab2 = manager.createTab({ url: 'https://site2.com' });

    expect(manager.getActiveTab()?.id).toBe(tab2.id);

    manager.switchTab(tab1.id);
    expect(manager.getActiveTab()?.id).toBe(tab1.id);
  });

  it('closes tabs and switches to adjacent tab when active tab is closed', () => {
    const tab1 = manager.createTab({ url: 'https://tab1.com' });
    const tab2 = manager.createTab({ url: 'https://tab2.com' });
    const tab3 = manager.createTab({ url: 'https://tab3.com' });

    // Active tab is tab3. Closing tab3 should activate tab2
    const result = manager.closeTab(tab3.id);
    expect(result?.closedTab.id).toBe(tab3.id);
    expect(result?.nextActiveTab?.id).toBe(tab2.id);
    expect(manager.getActiveTab()?.id).toBe(tab2.id);
    expect(manager.getTabCount()).toBe(2);
  });

  it('reorders tabs properly', () => {
    const tab1 = manager.createTab({ url: 'https://tab1.com' });
    const tab2 = manager.createTab({ url: 'https://tab2.com' });
    const tab3 = manager.createTab({ url: 'https://tab3.com' });

    // Move tab3 (index 2) to position 0
    const reordered = manager.reorderTab(tab3.id, 0);
    expect(reordered).toBe(true);

    const tabs = manager.getAllTabs();
    expect(tabs[0].id).toBe(tab3.id);
    expect(tabs[1].id).toBe(tab1.id);
    expect(tabs[2].id).toBe(tab2.id);
  });

  it('duplicates tabs preserving profile ID and URL', () => {
    const original = manager.createTab({
      url: 'https://finance.com',
      profileId: 'work-profile',
    });

    const dup = manager.duplicateTab(original.id);
    expect(dup).not.toBeNull();
    expect(dup?.id).not.toBe(original.id);
    expect(dup?.url).toBe('https://finance.com');
    expect(dup?.profileId).toBe('work-profile');
    expect(manager.getTabCount()).toBe(2);
  });
});

