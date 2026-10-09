import React, { FormEvent, useEffect, useState } from 'react';
import { User, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Cloud, LoaderCircle, LogOut, RefreshCw, X } from 'lucide-react';
import { getFirebaseServices, isFirebaseConfigured } from '../services/firebase';
import { deleteProfileFromCloud, saveProfileToCloud, syncProfilesFromCloud } from '../services/cloud-profile-sync';

interface CloudSyncPanelProps {
  onProfilesUpdated: () => void;
  onAuthChanged: (authenticated: boolean) => void;
  required?: boolean;
}

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({
  onProfilesUpdated,
  onAuthChanged,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    onAuthChanged(false);
    if (!isFirebaseConfigured) return;

    try {
      const { auth } = getFirebaseServices();
      return onAuthStateChanged(auth, (account) => {
        setUser(account);
        if (account) {
          setBusy(true);
          setError('');
          account.getIdToken()
            .then((idToken) => window.browserAPI.setAuthenticatedUser({
              idToken,
              apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            }))
            .then(() => syncProfilesFromCloud(account))
            .then(() => {
              setStatus('Profiles synced');
              onProfilesUpdated();
              onAuthChanged(true);
            })
            .catch(async (syncError: unknown) => {
              const authErrorMessage = syncError instanceof Error ? syncError.message : String(syncError);
              try {
                await window.browserAPI.setAuthenticatedUser(null);
              } catch (clearError) {
                setError(`${authErrorMessage}; ${clearError instanceof Error ? clearError.message : String(clearError)}`);
                onAuthChanged(false);
                return;
              }
              setError(authErrorMessage);
              onAuthChanged(false);
            })
            .finally(() => setBusy(false));
        } else {
          window.browserAPI.setAuthenticatedUser(null).catch((authError: unknown) => {
            setError(authError instanceof Error ? authError.message : String(authError));
          });
          onAuthChanged(false);
          setStatus('');
        }
      }, (authError) => {
        setError(authError.message);
        onAuthChanged(false);
      });
    } catch (configError) {
      setError(configError instanceof Error ? configError.message : String(configError));
      onAuthChanged(false);
    }
  }, [onAuthChanged, onProfilesUpdated]);

  useEffect(() => {
    if (!user) return;
    return window.browserAPI.onProfileSyncChanged((change) => {
      setBusy(true);
      setError('');
      const operation = change.type === 'delete'
        ? deleteProfileFromCloud(user, change.profileId)
        : window.browserAPI.listProfiles().then((profiles) => {
            const profile = profiles.find((item) => item.id === change.profileId);
            return profile ? saveProfileToCloud(user, profile) : undefined;
          });

      operation
        .then(() => setStatus('Profiles synced'))
        .catch((syncError: unknown) => setError(syncError instanceof Error ? syncError.message : String(syncError)))
        .finally(() => setBusy(false));
    });
  }, [user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isFirebaseConfigured) return;
    setBusy(true);
    setError('');
    try {
      const { auth } = getFirebaseServices();
      if (createAccount) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      setPassword('');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : String(authError));
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      const idToken = await user.getIdToken();
      await window.browserAPI.setAuthenticatedUser({
        idToken,
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      });
      await syncProfilesFromCloud(user);
      onProfilesUpdated();
      onAuthChanged(true);
      setStatus('Profiles synced');
    } catch (syncError) {
      const syncErrorMessage = syncError instanceof Error ? syncError.message : String(syncError);
      try {
        await window.browserAPI.setAuthenticatedUser(null);
      } catch (clearError) {
        setError(`${syncErrorMessage}; ${clearError instanceof Error ? clearError.message : String(clearError)}`);
        if (required) onAuthChanged(false);
        return;
      }
      setError(syncErrorMessage);
      if (required) onAuthChanged(false);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      const { auth } = getFirebaseServices();
      await signOut(auth);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : String(authError));
    } finally {
      setBusy(false);
    }
  };

  const blockingSignIn = required && !user;
  const blockingSync = required && Boolean(user);
  const showDialog = isOpen || (required && (!user || busy || Boolean(error)));

  return (
    <>
      {!required && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{ position: 'fixed', top: 12, right: 20, zIndex: 50, display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, background: '#191b24', color: '#aab4c5', cursor: 'pointer', fontSize: 11, padding: 8, borderRadius: 6 }}
        >
          <Cloud size={14} />
          {user ? user.email : 'Cloud sync'}
        </button>
      )}
      {showDialog && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: blockingSignIn || blockingSync ? '#121316' : 'rgba(0,0,0,.72)', display: 'grid', placeItems: 'center' }}
          onClick={() => {
            if (!required) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cloud-sync-title"
            style={{ width: 420, maxWidth: '92vw', padding: 24, borderRadius: 14, background: '#191b24', border: '1px solid #34394b', boxShadow: '0 24px 70px #000a' }}
            onClick={(event) => event.stopPropagation()}
          >
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 id="cloud-sync-title" style={{ margin: 0, fontSize: 18, color: '#fff' }}>Profile cloud sync</h2>
              {!required && (
                <button type="button" aria-label="Close" onClick={() => setIsOpen(false)} style={{ border: 0, background: 'transparent', color: '#aab4c5', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              )}
            </header>
            <p style={{ color: '#aab4c5', fontSize: 12, lineHeight: 1.6, margin: '0 0 16px' }}>
              Syncs persistent profiles and settings. Proxy usernames/passwords and Chrome browsing data are never uploaded.
            </p>
            {!isFirebaseConfigured ? (
              <p role="alert" style={{ color: '#fca5a5', fontSize: 12 }}>
                Firebase is not configured. Add the Web app settings to .env.local and rebuild.
              </p>
            ) : blockingSync ? (
              <div>
                <p role="status" style={{ color: '#e2e4e9', fontSize: 13, margin: '0 0 16px' }}>
                  {busy ? `Loading cloud profiles for ${user?.email}…` : 'Cloud sync must finish before profiles can be used.'}
                </p>
                {!busy && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={handleSync} style={primaryButtonStyle}>
                      <RefreshCw size={15} /> Retry sync
                    </button>
                    <button type="button" onClick={handleSignOut} style={secondaryButtonStyle}>
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : user ? (
              <div>
                <p style={{ color: '#e2e4e9', fontSize: 13, margin: '0 0 16px' }}>{user.email}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button type="button" disabled={busy} onClick={handleSync} style={primaryButtonStyle}>
                    {busy ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}
                    Sync now
                  </button>
                  <button type="button" disabled={busy} onClick={handleSignOut} style={secondaryButtonStyle}>
                    <LogOut size={15} /> Sign out
                  </button>
                  <span role="status" style={{ color: '#86efac', fontSize: 11 }}>{status}</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
                <input
                  aria-label="Email"
                  autoComplete="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  style={inputStyle}
                />
                <input
                  aria-label="Password"
                  autoComplete={createAccount ? 'new-password' : 'current-password'}
                  type="password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  style={inputStyle}
                />
                <button type="submit" disabled={busy} style={primaryButtonStyle}>
                  {busy && <LoaderCircle size={15} className="spin" />}
                  {createAccount ? 'Create account' : 'Sign in'}
                </button>
                <button type="button" onClick={() => setCreateAccount((value) => !value)} style={{ border: 0, background: 'transparent', color: '#93b4ff', cursor: 'pointer', fontSize: 12, justifySelf: 'start' }}>
                  {createAccount ? 'Already have an account? Sign in' : 'Need an account? Create one'}
                </button>
              </form>
            )}
            {error && <p role="alert" style={{ color: '#fca5a5', fontSize: 12, margin: '14px 0 0', overflowWrap: 'anywhere' }}>{error}</p>}
          </section>
        </div>
      )}
    </>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #373c4f',
  borderRadius: 7,
  background: '#101116',
  color: '#fff',
  fontSize: 13,
};

const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '9px 12px',
  border: 0,
  borderRadius: 7,
  background: '#3b82f6',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 12,
};

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: '#292d3a',
};
