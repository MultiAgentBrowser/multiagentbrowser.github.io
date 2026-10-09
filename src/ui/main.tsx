import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { TabInfo, Profile, PrivacyStats } from '../security/ipc-contracts';
import { TabBar } from './components/TabBar';
import { NavigationBar } from './components/NavigationBar';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import { PrivacyDashboard } from './components/PrivacyDashboard';
import './styles/index.css';

const App: React.FC = () => {
  const [tabs, setTabs] = useState<TabInfo[]>([
    {
      id: 'tab-initial',
      url: 'https://duckduckgo.com',
      title: 'DuckDuckGo — Privacy, simplified.',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      profileId: 'default',
    },
  ]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('default');
  const [isProfilesModalOpen, setIsProfilesModalOpen] = useState<boolean>(false);
  const [isPrivacyDashboardOpen, setIsPrivacyDashboardOpen] = useState<boolean>(false);
  const [activeTabId, setActiveTabId] = useState<string>('tab-initial');
  const [urlInput, setUrlInput] = useState<string>('https://duckduckgo.com');
  const [stats, setStats] = useState<PrivacyStats>({
    trackersBlocked: 0,
    fingerprintingAttemptsBlocked: 0,
    cookiesBlocked: 0,
    privacyScore: 92,
    webrtcProtected: true,
    proxyConnected: false,
    httpsSecure: true,
  });

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  const refreshProfiles = useCallback(() => {
    if (window.browserAPI) {
      window.browserAPI.listProfiles().then((list) => {
        setProfiles(list);
        if (list.length > 0 && !list.some((p) => p.id === activeProfileId)) {
          setActiveProfileId(list[0].id);
        }
      });
    }
  }, [activeProfileId]);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    if (window.browserAPI && (window.browserAPI as any).setWebviewVisibility) {
      (window.browserAPI as any).setWebviewVisibility(!isProfilesModalOpen && !isPrivacyDashboardOpen);
    }
  }, [isProfilesModalOpen, isPrivacyDashboardOpen]);

  useEffect(() => {
    if (window.browserAPI) {
      window.browserAPI.listTabs().then((serverTabs) => {
        if (serverTabs && serverTabs.length > 0) {
          setTabs(serverTabs);
          setActiveTabId(serverTabs[0].id);
          setUrlInput(serverTabs[0].url);
        }
      });

      const unsubUpdated = window.browserAPI.onTabUpdated((updatedTab) => {
        setTabs((prev) => {
          const exists = prev.some((t) => t.id === updatedTab.id);
          if (!exists) {
            return [...prev, updatedTab];
          }
          return prev.map((t) => (t.id === updatedTab.id ? updatedTab : t));
        });
        if (updatedTab.id === activeTabId) {
          setUrlInput(updatedTab.url);
        }
      });

      const unsubClosed = window.browserAPI.onTabClosed((closedId) => {
        setTabs((prev) => {
          const next = prev.filter((t) => t.id !== closedId);
          if (closedId === activeTabId && next.length > 0) {
            const fallback = next[next.length - 1];
            setActiveTabId(fallback.id);
            setUrlInput(fallback.url);
            window.browserAPI.switchTab(fallback.id);
          }
          return next;
        });
      });

      const unsubStats = window.browserAPI.onPrivacyStatsUpdated((newStats) => {
        setStats(newStats);
      });

      return () => {
        unsubUpdated();
        unsubClosed();
        unsubStats();
      };
    }
  }, [activeTabId]);

  const handleSelectTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    const target = tabs.find((t) => t.id === tabId);
    if (target) {
      setUrlInput(target.url);
    }
    window.browserAPI?.switchTab(tabId);
  }, [tabs]);

  const handleNewTab = useCallback(async () => {
    if (window.browserAPI) {
      const tab = await window.browserAPI.createTab(undefined, activeProfileId);
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
      setUrlInput(tab.url);
    }
  }, [activeProfileId]);

  const handleCloseTab = useCallback(async (tabId: string) => {
    if (window.browserAPI) {
      await window.browserAPI.closeTab(tabId);
    }
  }, []);

  const handleNavigate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (window.browserAPI && activeTab) {
      window.browserAPI.navigateTab(activeTab.id, urlInput);
    }
  }, [activeTab, urlInput]);

  const handleGoBack = useCallback(() => {
    if (window.browserAPI && activeTab) {
      window.browserAPI.goBack(activeTab.id);
    }
  }, [activeTab]);

  const handleGoForward = useCallback(() => {
    if (window.browserAPI && activeTab) {
      window.browserAPI.goForward(activeTab.id);
    }
  }, [activeTab]);

  const handleReload = useCallback(() => {
    if (window.browserAPI && activeTab) {
      window.browserAPI.reloadTab(activeTab.id);
    }
  }, [activeTab]);

  const handleToggleDevTools = useCallback(() => {
    if (window.browserAPI && activeTab) {
      window.browserAPI.toggleDevTools(activeTab.id);
    }
  }, [activeTab]);

  const handleSelectProfile = useCallback((profileId: string) => {
    setActiveProfileId(profileId);
    window.browserAPI?.setActiveProfile(profileId);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        handleNewTab();
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        if (activeTab) handleCloseTab(activeTab.id);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReload();
      } else if (e.key === '[') {
        e.preventDefault();
        handleGoBack();
      } else if (e.key === ']') {
        e.preventDefault();
        handleGoForward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleNewTab, handleCloseTab, handleReload, handleGoBack, handleGoForward]);

  return (
    <div className="app-container">
      {/* Titlebar with TabBar */}
      <div className="window-titlebar">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onNewTab={handleNewTab}
        />
      </div>

      {/* Navigation Toolbar */}
      <NavigationBar
        activeTab={activeTab}
        activeProfile={activeProfile}
        stats={stats}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        onNavigate={handleNavigate}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onReload={handleReload}
        onToggleDevTools={handleToggleDevTools}
        onOpenProfiles={() => setIsProfilesModalOpen(true)}
        onOpenPrivacyDashboard={() => setIsPrivacyDashboardOpen(!isPrivacyDashboardOpen)}
      />

      {/* Docking Viewport for Chromium WebContentsView */}
      <div className="web-viewport" id="web-viewport" />

      {/* Privacy Status Bar */}
      <div className="status-bar">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span>
            <strong style={{ color: '#34d399' }}>Privacy Score:</strong> {stats.privacyScore}/100
          </span>
          <span>
            Trackers Blocked: <strong>{stats.trackersBlocked}</strong>
          </span>
          <span>
            Fingerprinting Attempts: <strong>{stats.fingerprintingAttemptsBlocked}</strong>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span>WebRTC: {stats.webrtcProtected ? '✓ Protected' : '⚠ Exposed'}</span>
          <span>Proxy: {stats.proxyConnected ? 'Connected' : 'Direct'}</span>
        </div>
      </div>

      {/* Privacy Dashboard Popover */}
      <PrivacyDashboard
        isOpen={isPrivacyDashboardOpen}
        onClose={() => setIsPrivacyDashboardOpen(false)}
        stats={stats}
        activeTab={activeTab}
        activeProfile={activeProfile}
        onClearSiteData={async () => {
          if (window.browserAPI && activeProfile) {
            await window.browserAPI.clearStorage(activeProfile.id);
            alert('Site data and cookies cleared for this profile.');
          }
        }}
      />

      {/* Profile Switcher Modal */}
      <ProfileSwitcher
        isOpen={isProfilesModalOpen}
        onClose={() => setIsProfilesModalOpen(false)}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelectProfile={handleSelectProfile}
        onRefreshProfiles={refreshProfiles}
      />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
