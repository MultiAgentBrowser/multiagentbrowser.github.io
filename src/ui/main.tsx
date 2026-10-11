import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { LoaderCircle } from 'lucide-react';
import { Profile } from '../security/ipc-contracts';
import { CloudSyncPanel } from './components/CloudSyncPanel';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import appLogo from './icon.svg';
import './styles/index.css';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<'checking' | 'syncing' | 'signedOut' | 'ready' | 'error'>('checking');
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

  const handleAuthStateChanged = useCallback((state: typeof authState) => {
    setAuthState(state);
    if (state === 'signedOut' || state === 'error') {
      setProfiles([]);
      setProfilesLoaded(false);
    }
  }, []);

  return (
    <div className="app-container">
      {authState === 'ready' ? (
        <>
          <header className="window-titlebar" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e2e4e9', fontWeight: 650 }}>
              <img src={appLogo} alt="" width={22} height={22} />
              <span>Multi Agent</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 110 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8de3bd', backgroundColor: 'rgba(52, 211, 153, 0.08)', padding: '3px 9px', borderRadius: 12, border: '1px solid rgba(52, 211, 153, 0.16)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#34d399' }} />
                <span>Cloud Connected</span>
              </div>
            </div>
          </header>

          <main style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            {profilesLoaded ? (
              <ProfileSwitcher
                profiles={profiles}
                isAuthenticated
                onRefreshProfiles={refreshProfiles}
              />
            ) : (
              <div role="status" style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#9ba1b0' }}>
                Loading your profiles…
              </div>
            )}
          </main>
        </>
      ) : authState === 'checking' || authState === 'syncing' ? (
        <main
          role="status"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            color: '#9ba1b0',
          }}
        >
          <img src={appLogo} alt="Multi Agent" width={56} height={56} />
          <LoaderCircle size={22} className="spin" aria-hidden="true" />
          <span>{authState === 'syncing' ? 'Loading your profiles…' : 'Checking your account…'}</span>
        </main>
      ) : null}

      <CloudSyncPanel
        required={authState !== 'ready'}
        onProfilesUpdated={refreshProfiles}
        onAuthStateChanged={handleAuthStateChanged}
      />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
