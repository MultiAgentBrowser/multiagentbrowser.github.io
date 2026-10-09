import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ShieldCheck } from 'lucide-react';
import { Profile } from '../security/ipc-contracts';
import { CloudSyncPanel } from './components/CloudSyncPanel';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import './styles/index.css';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState(false);

  const refreshProfiles = useCallback(async () => {
    const list = await window.browserAPI.listProfiles();
    setProfiles(list);
    setProfilesLoaded(true);
  }, []);

  const handleAuthChanged = useCallback((authenticated: boolean) => {
    setIsAuthenticated(authenticated);
    if (!authenticated) {
      setProfiles([]);
      setProfilesLoaded(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) void refreshProfiles();
  }, [isAuthenticated, refreshProfiles]);

  return (
    <div className="app-container">
      {isAuthenticated && (
        <>
          <header className="window-titlebar" style={{ justifyContent: 'space-between', paddingLeft: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e2e4e9', fontWeight: 650 }}>
              <ShieldCheck size={19} color="#60a5fa" />
              Privacy Browser
            </div>
          </header>

          <main style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            {profilesLoaded ? (
              <ProfileSwitcher
                profiles={profiles}
                onRefreshProfiles={refreshProfiles}
              />
            ) : (
              <div role="status" style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#9ba1b0' }}>
                Loading your profiles…
              </div>
            )}
          </main>
        </>
      )}

      <CloudSyncPanel
        required={!isAuthenticated}
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
