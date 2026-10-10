import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Profile } from '../security/ipc-contracts';
import { CloudSyncPanel } from './components/CloudSyncPanel';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import appLogo from '../../build/icon.svg';
import './styles/index.css';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState(false);

  const refreshProfiles = useCallback(async () => {
    try {
      const list = await window.browserAPI.listProfiles();
      setProfiles(list || []);
    } catch (err) {
      console.error('Failed to list profiles:', err);
    } finally {
      setProfilesLoaded(true);
    }
  }, []);

  const handleAuthChanged = useCallback((authenticated: boolean) => {
    setIsAuthenticated(authenticated);
    void refreshProfiles();
  }, [refreshProfiles]);

  // Always load profiles immediately upon app launch
  useEffect(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  return (
    <div className="app-container">
      <header className="window-titlebar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e2e4e9', fontWeight: 650 }}>
          <img src={appLogo} alt="" width={22} height={22} />
          <span>Multi Agent</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 110 }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8de3bd', backgroundColor: 'rgba(52, 211, 153, 0.08)', padding: '3px 9px', borderRadius: 12, border: '1px solid rgba(52, 211, 153, 0.16)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#34d399' }} />
              <span>Cloud Connected</span>
            </div>
          ) : (
            <span style={{ fontSize: 11, color: '#838b9b' }}>Local Workspace</span>
          )}
        </div>
      </header>

      <main style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {profilesLoaded ? (
          <ProfileSwitcher
            profiles={profiles}
            isAuthenticated={isAuthenticated}
            onRefreshProfiles={refreshProfiles}
          />
        ) : (
          <div role="status" style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#9ba1b0' }}>
            Loading your profiles…
          </div>
        )}
      </main>

      <CloudSyncPanel
        required={false}
        onProfilesUpdated={refreshProfiles}
        onAuthChanged={handleAuthChanged}
      />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
