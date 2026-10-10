import React, { FormEvent, useEffect, useState } from 'react';
import { User, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  AlertTriangle,
  Check,
  Cloud,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
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
        onAuthChanged(false);
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
          onProfilesUpdated();
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
      await window.browserAPI.setAuthenticatedUser(null);
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

  useEffect(() => {
    if (!showDialog || required) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [required, showDialog]);

  return (
    <>
      {!required && (
        <button
          type="button"
          className="settings-trigger"
          aria-label="Open settings"
          title="Settings"
          onClick={() => setIsOpen(true)}
        >
          <Settings size={14} />
          Settings
        </button>
      )}
      {showDialog && (
        <div
          className={`settings-overlay${required ? ' settings-overlay--blocking' : ''}`}
          onClick={() => {
            if (!required) setIsOpen(false);
          }}
        >
          <section
            className="settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cloud-sync-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="settings-header">
              <div className="settings-heading">
                <span className="settings-heading-icon"><Settings size={18} /></span>
                <div>
                  <p className="settings-eyebrow">MULTI AGENT</p>
                  <h2 id="cloud-sync-title">
                    {blockingSignIn ? 'Sign in to continue' : required ? 'Profile cloud sync' : 'Settings'}
                  </h2>
                  <p className="settings-subtitle">
                    {blockingSignIn ? 'Sign in to access your browser profiles' : 'Manage your account and profile sync'}
                  </p>
                </div>
              </div>
              {!required && (
                <button type="button" className="settings-close" aria-label="Close settings" onClick={() => setIsOpen(false)}>
                  <X size={18} />
                </button>
              )}
            </header>
            <div className="settings-layout">
              <nav className="settings-nav" aria-label="Settings sections">
                <p className="settings-nav-label">PREFERENCES</p>
                <div className="settings-nav-item" aria-current="page">
                  <UserRound size={16} />
                  <span>Account &amp; sync</span>
                </div>
              </nav>
              <div className="settings-content">
                <div className="settings-section-heading">
                  <div>
                    <h3>Account &amp; sync</h3>
                    <p>Sign-in and cloud profile synchronization</p>
                  </div>
                  <Cloud size={19} />
                </div>
                {!isFirebaseConfigured ? (
                  <div className="settings-notice settings-notice--error" role="alert">
                    <AlertTriangle size={17} />
                    <p>Cloud sync is not configured. Add the Firebase web app settings to <code>.env.local</code> and rebuild.</p>
                  </div>
                ) : blockingSync ? (
                  <div className="settings-account-card">
                    <div className="settings-account-identity">
                      <span className="settings-avatar"><UserRound size={20} /></span>
                      <div className="settings-account-details">
                        <span className="settings-field-label">SIGNED-IN ACCOUNT</span>
                        <strong>{user?.email || 'Your account'}</strong>
                      </div>
                    </div>
                    <div className="settings-sync-status" role="status">
                      {busy ? <LoaderCircle size={16} className="spin" /> : <AlertTriangle size={16} />}
                      <span>{busy ? 'Syncing your profiles…' : 'Cloud sync needs attention'}</span>
                    </div>
                    {!busy && (
                      <div className="settings-actions">
                        <button type="button" className="settings-button settings-button--primary" onClick={handleSync}>
                          <RefreshCw size={15} /> Retry sync
                        </button>
                        <button type="button" className="settings-button settings-button--danger" onClick={handleSignOut}>
                          <LogOut size={15} /> Log out
                        </button>
                      </div>
                    )}
                  </div>
                ) : user ? (
                  <div className="settings-account-card">
                    <div className="settings-account-identity">
                      <span className="settings-avatar"><UserRound size={20} /></span>
                      <div className="settings-account-details">
                        <span className="settings-field-label">SIGNED-IN ACCOUNT</span>
                        <strong>{user.email || 'Account email unavailable'}</strong>
                      </div>
                      <span className="settings-badge"><span /> Connected</span>
                    </div>
                    <div className="settings-sync-status" role="status">
                      {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}
                      <span>{busy ? 'Syncing profile changes…' : status || 'Cloud sync is ready'}</span>
                    </div>
                    <div className="settings-actions">
                      <button type="button" className="settings-button settings-button--primary" disabled={busy} onClick={handleSync}>
                        {busy ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}
                        Sync now
                      </button>
                      <button type="button" className="settings-button settings-button--danger" disabled={busy} onClick={handleSignOut}>
                        <LogOut size={15} /> Log out
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="settings-auth-form">
                    <label htmlFor="settings-email">Email address</label>
                    <input
                      id="settings-email"
                      autoComplete="email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                    />
                    <label htmlFor="settings-password">Password</label>
                    <input
                      id="settings-password"
                      autoComplete={createAccount ? 'new-password' : 'current-password'}
                      type="password"
                      minLength={6}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                    />
                    <button type="submit" disabled={busy} className="settings-button settings-button--primary settings-submit">
                      {busy && <LoaderCircle size={15} className="spin" />}
                      {createAccount ? 'Create account' : 'Sign in'}
                    </button>
                    <button type="button" className="settings-link-button" onClick={() => setCreateAccount((value) => !value)}>
                      {createAccount ? 'Already have an account? Sign in' : 'Need an account? Create one'}
                    </button>
                  </form>
                )}
                <div className="settings-privacy-note">
                  <ShieldCheck size={17} />
                  <p><strong>Your browsing data stays private.</strong> Profiles sync to your account. Proxy passwords and Chrome browsing data are never uploaded.</p>
                </div>
                {error && <div className="settings-notice settings-notice--error" role="alert"><AlertTriangle size={17} /><p>{error}</p></div>}
              </div>
            </div>
            {!required && <footer className="settings-footer">Changes to profiles sync automatically when cloud sync is connected.</footer>}
          </section>
        </div>
      )}
    </>
  );
};
