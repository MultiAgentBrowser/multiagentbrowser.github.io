import React, { useState, useEffect } from 'react';
import {
  User,
  Plus,
  Play,
  Square,
  Trash2,
  Copy,
  Download,
  Upload,
  Search,
  CheckCircle2,
  X,
  Shield,
  Radio,
  Globe,
  Settings,
  Apple,
  Monitor,
  Wifi,
  ExternalLink,
  Edit2,
  Loader2,
} from 'lucide-react';
import { Profile, ProxyConfig } from '../../security/ipc-contracts';
import { AVAILABLE_BROWSERS, getBrowserUserAgent } from '../../profiles/browser-definitions';

interface ProfileSwitcherProps {
  profiles: Profile[];
  onRefreshProfiles: () => void;
}

export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({
  profiles,
  onRefreshProfiles,
}) => {
  // Navigation & filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOS, setFilterOS] = useState<'all' | 'mac' | 'windows'>('all');
  const [filterBrowser, setFilterBrowser] = useState<'all' | 'chrome' | 'edge' | 'brave'>('all');
  const [runningProfileIds, setRunningProfileIds] = useState<string[]>([]);

  // Creation & Editing modal state
  const [isCreateOpen, setIsCreateOpen] = useState(profiles.length === 0);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [os, setOs] = useState<'mac' | 'windows'>('mac');
  const [browserType, setBrowserType] = useState<'chrome' | 'edge' | 'brave'>('chrome');
  const [browserVersion, setBrowserVersion] = useState<string>('131.0.6778.86');
  const [color, setColor] = useState('#3b82f6');
  const [notes, setNotes] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<'standard' | 'balanced' | 'strict'>('balanced');
  const [webrtcPolicy, setWebrtcPolicy] = useState<'default' | 'default_public_interface_only' | 'disable_non_proxied_udp'>('default_public_interface_only');
  const [isTemporary, setIsTemporary] = useState(false);

  // Proxy form fields
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyMode, setProxyMode] = useState<'direct' | 'http' | 'https' | 'socks5'>('socks5');
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState<number>(9050);
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');

  // Proxy test state
  const [testingProxy, setTestingProxy] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<{ success: boolean; latencyMs?: number; error?: string } | null>(null);

  // Import JSON drawer
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');

  // Fetch running profiles
  useEffect(() => {
    if (window.browserAPI && (window.browserAPI as any).getRunningProfiles) {
      (window.browserAPI as any).getRunningProfiles().then((running: string[]) => {
        setRunningProfileIds(running || []);
      });

      const unsub = (window.browserAPI as any).onRunningProfilesUpdated?.((running: string[]) => {
        setRunningProfileIds(running || []);
      });

      return () => {
        if (unsub) unsub();
      };
    }
  }, []);

  useEffect(() => {
    if (profiles.length === 0) {
      setEditingProfileId(null);
      setIsCreateOpen(true);
    }
  }, [profiles.length]);

  const filteredProfiles = profiles.filter((p) => {
    const matchesQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p as any).notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.proxy.host.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOS = filterOS === 'all' || (p as any).os === filterOS;
    const pBrowser = (p as any).browserType || 'chrome';
    const matchesBrowser = filterBrowser === 'all' || pBrowser === filterBrowser;
    return matchesQuery && matchesOS && matchesBrowser;
  });

  const handleLaunch = async (profileId: string) => {
    if (window.browserAPI && (window.browserAPI as any).launchProfile) {
      try {
        const result = await (window.browserAPI as any).launchProfile(profileId);
        if (!result.success) {
          alert('This profile is already running in its own browser window.');
        }
        const running = await (window.browserAPI as any).getRunningProfiles();
        setRunningProfileIds(running);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        alert(`Could not launch profile: ${message}`);
      }
    }
  };

  const handleStop = async (profileId: string) => {
    if (window.browserAPI && (window.browserAPI as any).stopProfile) {
      await (window.browserAPI as any).stopProfile(profileId);
      const running = await (window.browserAPI as any).getRunningProfiles();
      setRunningProfileIds(running);
    }
  };

  const handleOpenCreate = () => {
    setEditingProfileId(null);
    setName(`Profile ${profiles.length + 1}`);
    setOs('mac');
    setBrowserType('chrome');
    setBrowserVersion('131.0.6778.86');
    setColor('#3b82f6');
    setNotes('');
    setPrivacyLevel('balanced');
    setWebrtcPolicy('default_public_interface_only');
    setIsTemporary(false);
    setProxyEnabled(false);
    setProxyMode('socks5');
    setProxyHost('');
    setProxyPort(9050);
    setProxyUsername('');
    setProxyPassword('');
    setProxyTestResult(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (p: Profile) => {
    setEditingProfileId(p.id);
    setName(p.name);
    setOs((p as any).os || 'mac');
    setBrowserType((p as any).browserType || 'chrome');
    setBrowserVersion((p as any).browserVersion || '131.0.6778.86');
    setColor(p.color || '#3b82f6');
    setNotes((p as any).notes || '');
    setPrivacyLevel(p.privacyLevel);
    setWebrtcPolicy(p.webrtcPolicy);
    setIsTemporary(p.isTemporary);
    setProxyEnabled(p.proxy.enabled);
    setProxyMode(p.proxy.mode);
    setProxyHost(p.proxy.host);
    setProxyPort(p.proxy.port);
    setProxyUsername(p.proxy.username || '');
    setProxyPassword(p.proxy.password || '');
    setProxyTestResult(null);
    setIsCreateOpen(true);
  };

  const handleSaveProfile = async (andLaunch: boolean = false) => {
    if (!name.trim() || !window.browserAPI) return;

    const proxyData: ProxyConfig = {
      enabled: proxyEnabled,
      mode: proxyEnabled ? proxyMode : 'direct',
      host: proxyHost.trim(),
      port: Number(proxyPort) || 8080,
      username: proxyUsername ? proxyUsername.trim() : undefined,
      password: proxyPassword ? proxyPassword.trim() : undefined,
    };

    if (editingProfileId) {
      await window.browserAPI.updateProfile(editingProfileId, {
        name: name.trim(),
        privacyLevel,
        webrtcPolicy,
        proxy: proxyData,
        os,
        browserType,
        browserVersion,
        notes,
        color,
      } as any);
      if (andLaunch) {
        await handleLaunch(editingProfileId);
      }
    } else {
      const created = await window.browserAPI.createProfile({
        name: name.trim(),
        isTemporary,
        privacyLevel,
        webrtcPolicy,
        proxy: proxyData,
        os,
        browserType,
        browserVersion,
        notes,
        color,
      } as any);

      if (andLaunch && created && (window.browserAPI as any).launchProfile) {
        await handleLaunch(created.id);
      }
    }

    setIsCreateOpen(false);
    onRefreshProfiles();
  };

  const handleTestProxy = async () => {
    if (!proxyHost.trim() || !window.browserAPI) return;
    setTestingProxy(true);
    setProxyTestResult(null);
    try {
      const result = await window.browserAPI.testProxy({
        enabled: true,
        mode: proxyMode,
        host: proxyHost.trim(),
        port: Number(proxyPort) || 8080,
      });
      setProxyTestResult(result);
    } catch (err: any) {
      setProxyTestResult({ success: false, error: err.message });
    } finally {
      setTestingProxy(false);
    }
  };

  const handleDelete = async (profileId: string) => {
    if (confirm('Delete this profile permanently and wipe all stored cookies & partition data?')) {
      await window.browserAPI.deleteProfile(profileId);
      onRefreshProfiles();
    }
  };

  const handleDuplicate = async (profileId: string) => {
    await window.browserAPI.duplicateProfile(profileId);
    onRefreshProfiles();
  };

  const handleExport = async (profileId: string) => {
    const json = await window.browserAPI.exportProfile(profileId);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profile-${profileId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJson.trim()) return;
    try {
      await window.browserAPI.importProfile(importJson.trim());
      setImportJson('');
      setShowImport(false);
      onRefreshProfiles();
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        minHeight: 0,
        backgroundColor: '#121316',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {!isCreateOpen && (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: 0,
          backgroundColor: '#16181f',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #272a38',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #1d202b 0%, #16181f 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <User size={22} color="#3b82f6" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  My Browser
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    backgroundColor: '#1e293b',
                    color: '#38bdf8',
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontWeight: 600,
                  }}
                >
                  Running Profiles: {runningProfileIds.length} ({profiles.length} Total)
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#8b92a2', margin: '2px 0 0 0' }}>
                Isolated multi-profile Chromium instances with independent cookies, cache, and proxies.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setShowImport(!showImport)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                backgroundColor: '#222533',
                border: '1px solid #33384c',
                borderRadius: 8,
                color: '#e2e4e9',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <Upload size={14} />
              Import
            </button>

            <button
              onClick={handleOpenCreate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                backgroundColor: '#3b82f6',
                border: 'none',
                borderRadius: 8,
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              }}
            >
              <Plus size={16} />
              New Profile
            </button>

          </div>
        </div>

        {/* Filter and Search Bar */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid #232636',
            backgroundColor: '#191b24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#12131b',
              border: '1px solid #2d3144',
              borderRadius: 8,
              padding: '0 12px',
              height: 36,
              width: 320,
              gap: 8,
            }}
          >
            <Search size={15} color="#8b92a2" />
            <input
              type="text"
              placeholder="Search profiles by name, notes, or proxy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#8b92a2', marginRight: 2 }}>Browser:</span>
              {(['all', 'chrome', 'edge', 'brave'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterBrowser(mode)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    backgroundColor: filterBrowser === mode ? '#10b981' : '#222533',
                    color: filterBrowser === mode ? '#ffffff' : '#9ba1b0',
                  }}
                >
                  {mode === 'all' ? 'All Browsers' : mode === 'chrome' ? 'Chrome' : mode === 'edge' ? 'Edge' : 'Brave'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#8b92a2', marginRight: 2 }}>Platform:</span>
              {(['all', 'mac', 'windows'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterOS(mode)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    backgroundColor: filterOS === mode ? '#3b82f6' : '#222533',
                    color: filterOS === mode ? '#ffffff' : '#9ba1b0',
                  }}
                >
                  {mode === 'all' ? 'All OS' : mode === 'mac' ? 'macOS' : 'Windows'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Import JSON drawer */}
        {showImport && (
          <div style={{ padding: '12px 24px', backgroundColor: '#1d202d', borderBottom: '1px solid #2f3448' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <textarea
                placeholder="Paste exported profile JSON configuration..."
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                rows={2}
                style={{
                  flex: 1,
                  backgroundColor: '#13141c',
                  border: '1px solid #33384c',
                  borderRadius: 6,
                  color: '#ffffff',
                  padding: 8,
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}
              />
              <button
                onClick={handleImportSubmit}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Import Now
              </button>
            </div>
          </div>
        )}

        {/* Profiles Table View */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #232636', color: '#8b92a2', fontSize: 11, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 24px' }}>Profile Name</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Browser Identity & Version</th>
                <th style={{ padding: '12px 16px' }}>OS</th>
                <th style={{ padding: '12px 16px' }}>Proxy</th>
                <th style={{ padding: '12px 16px' }}>Privacy</th>
                <th style={{ padding: '12px 24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((p) => {
                const isRunning = runningProfileIds.includes(p.id);
                const hasProxy = p.proxy.enabled && p.proxy.host;
                const profileOs = (p as any).os || 'mac';
                const profileBrowser = (p as any).browserType || 'chrome';
                const profileVersion = (p as any).browserVersion || '131.0.6778.86';

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #20222f',
                      transition: 'background 0.15s ease',
                      backgroundColor: isRunning ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isRunning ? 'rgba(16, 185, 129, 0.08)' : '#191b26')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isRunning ? 'rgba(16, 185, 129, 0.04)' : 'transparent')}
                  >
                    {/* Name & Tag */}
                    <td style={{ padding: '14px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: p.color || '#3b82f6',
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, color: '#ffffff', fontSize: 14 }}>
                              {p.name}
                            </span>
                            {p.isTemporary && (
                              <span
                                style={{
                                  fontSize: 10,
                                  backgroundColor: '#ef4444',
                                  color: '#fff',
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                }}
                              >
                                TEMP
                              </span>
                            )}
                          </div>
                          {(p as any).notes && (
                            <div style={{ fontSize: 11, color: '#8b92a2', marginTop: 2 }}>
                              {(p as any).notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status (Running vs Ready) */}
                    <td style={{ padding: '14px 16px' }}>
                      {isRunning ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: '#10b981',
                              boxShadow: '0 0 8px #10b981',
                            }}
                          />
                          <span style={{ color: '#10b981', fontWeight: 600, fontSize: 12 }}>
                            RUNNING
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#6b7280' }} />
                          <span style={{ color: '#8b92a2', fontSize: 12 }}>READY</span>
                        </div>
                      )}
                    </td>

                    {/* Browser & Version */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 11,
                            backgroundColor: profileBrowser === 'edge' ? '#0284c7' : profileBrowser === 'brave' ? '#ea580c' : '#2563eb',
                            color: '#ffffff',
                            padding: '2px 7px',
                            borderRadius: 4,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}
                        >
                          {profileBrowser}
                        </span>
                        <span style={{ color: '#e2e4e9', fontSize: 12, fontFamily: 'monospace' }}>
                          v{profileVersion.split('.')[0]}
                        </span>
                      </div>
                    </td>

                    {/* OS Platform */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ba1b0', fontSize: 12 }}>
                        {profileOs === 'windows' ? <Monitor size={15} /> : <Apple size={15} />}
                        <span>{profileOs === 'windows' ? 'Windows' : 'macOS'}</span>
                      </div>
                    </td>

                    {/* Proxy */}
                    <td style={{ padding: '14px 16px' }}>
                      {hasProxy ? (
                        <div>
                          <span
                            style={{
                              fontSize: 11,
                              backgroundColor: '#26293a',
                              color: '#34d399',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontWeight: 500,
                            }}
                          >
                            {p.proxy.mode.toUpperCase()}
                          </span>
                          <span style={{ marginLeft: 6, color: '#e2e4e9', fontSize: 12 }}>
                            {p.proxy.host}:{p.proxy.port}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#8b92a2', fontSize: 12 }}>Direct (No Proxy)</span>
                      )}
                    </td>

                    {/* Privacy & WebRTC */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12, color: '#e2e4e9' }}>
                          Level: <strong style={{ color: '#38bdf8' }}>{p.privacyLevel.toUpperCase()}</strong>
                        </span>
                        <span style={{ fontSize: 11, color: '#8b92a2' }}>
                          WebRTC: {p.webrtcPolicy === 'disable_non_proxied_udp' ? 'Strict UDP Kill' : 'Prevent LAN leak'}
                        </span>
                      </div>
                    </td>



                    {/* Actions */}
                    <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        {isRunning ? (
                          <button
                            onClick={() => handleStop(p.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 14px',
                              backgroundColor: '#ef4444',
                              border: 'none',
                              borderRadius: 6,
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <Square size={13} fill="#fff" />
                            Stop
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLaunch(p.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 16px',
                              backgroundColor: '#10b981',
                              border: 'none',
                              borderRadius: 6,
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                            }}
                          >
                            <Play size={13} fill="#fff" />
                            Launch
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEdit(p)}
                          style={{
                            background: '#232634',
                            border: '1px solid #32374b',
                            borderRadius: 6,
                            color: '#9ba1b0',
                            padding: 6,
                            cursor: 'pointer',
                          }}
                          title="Edit Profile"
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          onClick={() => handleDuplicate(p.id)}
                          style={{
                            background: '#232634',
                            border: '1px solid #32374b',
                            borderRadius: 6,
                            color: '#9ba1b0',
                            padding: 6,
                            cursor: 'pointer',
                          }}
                          title="Clone Profile"
                        >
                          <Copy size={14} />
                        </button>

                        <button
                          onClick={() => handleExport(p.id)}
                          style={{
                            background: '#232634',
                            border: '1px solid #32374b',
                            borderRadius: 6,
                            color: '#9ba1b0',
                            padding: 6,
                            cursor: 'pointer',
                          }}
                          title="Export Profile"
                        >
                          <Download size={14} />
                        </button>

                        <button
                          onClick={() => handleDelete(p.id)}
                          style={{
                            background: '#232634',
                            border: '1px solid #32374b',
                            borderRadius: 6,
                            color: '#ef4444',
                            padding: 6,
                            cursor: 'pointer',
                          }}
                          title="Delete Profile"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* The profile editor occupies the app page instead of opening as a dialog. */}
      {isCreateOpen && (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#16181f',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            minHeight: 0,
            backgroundColor: '#1a1c24',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
            {/* Editor Header */}
            <div
              style={{
                padding: '16px 22px',
                borderBottom: '1px solid #282c3d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: 0 }}>
                {editingProfileId ? 'Edit Profile Configuration' : 'Create New Profile'}
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'none', border: 'none', color: '#9ba1b0', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Editor Form */}
            <div style={{ flex: 1, minHeight: 0, padding: '20px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Profile Name & OS */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    Profile Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Amazon Store 1, Client Alpha"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      backgroundColor: '#12131b',
                      border: '1px solid #2f3448',
                      borderRadius: 8,
                      color: '#ffffff',
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ width: 140 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    Emulated OS
                  </label>
                  <select
                    value={os}
                    onChange={(e: any) => setOs(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      backgroundColor: '#12131b',
                      border: '1px solid #2f3448',
                      borderRadius: 8,
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="mac">macOS</option>
                    <option value="windows">Windows</option>
                  </select>
                </div>
              </div>

              {/* Select the browser identity exposed to websites by the bundled Chromium runtime. */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    Website Browser Identity
                  </label>
                  <select
                    value={browserType}
                    onChange={(e: any) => {
                      const newType = e.target.value;
                      setBrowserType(newType);
                      const def = AVAILABLE_BROWSERS.find((b) => b.id === newType);
                      if (def) setBrowserVersion(def.defaultVersion);
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      backgroundColor: '#12131b',
                      border: '1px solid #2f3448',
                      borderRadius: 8,
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  >
                    <option value="chrome">Google Chrome</option>
                    <option value="edge">Microsoft Edge</option>
                    <option value="brave">Brave Browser</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    Browser Version
                  </label>
                  <select
                    value={browserVersion}
                    onChange={(e) => setBrowserVersion(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      backgroundColor: '#12131b',
                      border: '1px solid #2f3448',
                      borderRadius: 8,
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  >
                    {AVAILABLE_BROWSERS.find((b) => b.id === browserType)?.versions.map((ver) => (
                      <option key={ver} value={ver}>
                        v{ver} {ver === AVAILABLE_BROWSERS.find((b) => b.id === browserType)?.defaultVersion ? '(Latest)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#8b92a2', marginTop: -8 }}>
                All profiles launch the bundled standalone Chromium browser. This setting changes only the browser identity websites see.
              </div>

              {/* User-Agent Preview */}
              <div
                style={{
                  backgroundColor: '#111218',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid #25283a',
                  fontSize: 11,
                  color: '#9ba1b0',
                  lineHeight: '1.4',
                  wordBreak: 'break-all',
                }}
              >
                <span style={{ color: '#60a5fa', fontWeight: 600 }}>Website User-Agent: </span>
                <span style={{ color: '#d1d5db', fontFamily: 'monospace' }}>
                  {getBrowserUserAgent(browserType, browserVersion, os)}
                </span>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                  Notes / Tags
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional description or account email..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#12131b',
                    border: '1px solid #2f3448',
                    borderRadius: 8,
                    color: '#ffffff',
                    fontSize: 12,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Proxy Section */}
              <div
                style={{
                  padding: 14,
                  backgroundColor: '#14161f',
                  border: '1px solid #292d3e',
                  borderRadius: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={proxyEnabled}
                      onChange={(e) => setProxyEnabled(e.target.checked)}
                    />
                    Enable Dedicated Proxy
                  </label>

                  {proxyEnabled && (
                    <button
                      type="button"
                      onClick={handleTestProxy}
                      disabled={testingProxy || !proxyHost.trim()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        backgroundColor: '#262a3c',
                        border: '1px solid #383e58',
                        borderRadius: 6,
                        color: '#38bdf8',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      {testingProxy ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                      Check Proxy
                    </button>
                  )}
                </div>

                {proxyEnabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <select
                        value={proxyMode}
                        onChange={(e: any) => setProxyMode(e.target.value)}
                        style={{
                          width: 110,
                          padding: '8px 10px',
                          backgroundColor: '#0f1017',
                          border: '1px solid #2f3448',
                          borderRadius: 6,
                          color: '#ffffff',
                          fontSize: 12,
                        }}
                      >
                        <option value="socks5">SOCKS5</option>
                        <option value="http">HTTP</option>
                        <option value="https">HTTPS</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Host (IP or domain)"
                        value={proxyHost}
                        onChange={(e) => setProxyHost(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          backgroundColor: '#0f1017',
                          border: '1px solid #2f3448',
                          borderRadius: 6,
                          color: '#ffffff',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />

                      <input
                        type="number"
                        placeholder="Port"
                        value={proxyPort}
                        onChange={(e) => setProxyPort(Number(e.target.value))}
                        style={{
                          width: 80,
                          padding: '8px 10px',
                          backgroundColor: '#0f1017',
                          border: '1px solid #2f3448',
                          borderRadius: 6,
                          color: '#ffffff',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <input
                        type="text"
                        placeholder="Username (optional)"
                        value={proxyUsername}
                        onChange={(e) => setProxyUsername(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          backgroundColor: '#0f1017',
                          border: '1px solid #2f3448',
                          borderRadius: 6,
                          color: '#ffffff',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                      <input
                        type="password"
                        placeholder="Password (optional)"
                        value={proxyPassword}
                        onChange={(e) => setProxyPassword(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          backgroundColor: '#0f1017',
                          border: '1px solid #2f3448',
                          borderRadius: 6,
                          color: '#ffffff',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                    </div>

                    {proxyTestResult && (
                      <div
                        style={{
                          fontSize: 11,
                          padding: '6px 10px',
                          borderRadius: 6,
                          backgroundColor: proxyTestResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: proxyTestResult.success ? '#34d399' : '#f87171',
                        }}
                      >
                        {proxyTestResult.success
                          ? `✓ Connection successful! Latency: ${proxyTestResult.latencyMs}ms`
                          : `✗ Connection failed: ${proxyTestResult.error}`}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Privacy & WebRTC Controls */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    Privacy Protection Mode
                  </label>
                  <select
                    value={privacyLevel}
                    onChange={(e: any) => setPrivacyLevel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#12131b',
                      border: '1px solid #2f3448',
                      borderRadius: 8,
                      color: '#ffffff',
                      fontSize: 12,
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="standard">Standard (Fast, Compatible)</option>
                    <option value="balanced">Balanced Privacy (Recommended)</option>
                    <option value="strict">Strict Privacy (Maximum Defense)</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    WebRTC IP Protection
                  </label>
                  <select
                    value={webrtcPolicy}
                    onChange={(e: any) => setWebrtcPolicy(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#12131b',
                      border: '1px solid #2f3448',
                      borderRadius: 8,
                      color: '#ffffff',
                      fontSize: 12,
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="default_public_interface_only">Prevent LAN IP Leaks</option>
                    <option value="disable_non_proxied_udp">Disable Non-Proxied UDP</option>
                    <option value="default">Default Chromium</option>
                  </select>
                </div>
              </div>

              {/* Ephemeral checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9ba1b0', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isTemporary}
                  onChange={(e) => setIsTemporary(e.target.checked)}
                />
                Temporary Profile (all cookies & partition data wiped upon close)
              </label>
            </div>

            {/* Editor Actions */}
            <div
              style={{
                padding: '14px 22px',
                borderTop: '1px solid #282c3d',
                backgroundColor: '#151720',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#232635',
                  border: '1px solid #33384c',
                  borderRadius: 8,
                  color: '#9ba1b0',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleSaveProfile(false)}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: 8,
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {editingProfileId ? 'Save Changes' : 'Create Profile'}
              </button>

              <button
                type="button"
                onClick={() => handleSaveProfile(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 18px',
                  backgroundColor: '#10b981',
                  border: 'none',
                  borderRadius: 8,
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
              >
                <Play size={13} fill="#fff" />
                Save & Launch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
