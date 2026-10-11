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
  RotateCw,
  Folder,
  Cookie,
  FileText,
  Bookmark,
  Layers,
  Flame,
  Compass,
  RefreshCw,
  AlertCircle,
  ArrowDownCircle,
  CheckCircle,
} from 'lucide-react';
import { Profile, ProxyConfig, SavedProxy } from '../../security/ipc-contracts';
import { getBrowserUserAgent } from '../../profiles/browser-definitions';

interface ProfileSwitcherProps {
  profiles: Profile[];
  isAuthenticated: boolean;
  onRefreshProfiles: () => void;
}

export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({
  profiles,
  isAuthenticated,
  onRefreshProfiles,
}) => {
  // Navigation & filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOS, setFilterOS] = useState<'all' | 'mac' | 'windows'>('all');
  const [filterBrowser, setFilterBrowser] = useState<'all' | 'chrome' | 'edge' | 'brave'>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [runningProfileIds, setRunningProfileIds] = useState<string[]>([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);

  // Creation & Editing modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<'general' | 'proxy' | 'privacy'>('general');

  // Form fields
  const [name, setName] = useState('');
  const [group, setGroup] = useState('Default');
  const [os, setOs] = useState<'mac' | 'windows'>('mac');
  const [browserType, setBrowserType] = useState<'chrome' | 'edge' | 'brave'>('chrome');
  const [browserVersion, setBrowserVersion] = useState<string>('150.0.0.0');
  const [customUserAgent, setCustomUserAgent] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [notes, setNotes] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<'standard' | 'balanced' | 'strict'>('balanced');
  const [webrtcPolicy, setWebrtcPolicy] = useState<'default' | 'default_public_interface_only' | 'disable_non_proxied_udp'>('default_public_interface_only');
  const [isTemporary, setIsTemporary] = useState(false);
  const [remoteDebuggingPort, setRemoteDebuggingPort] = useState<number | ''>('');

  // Proxy form fields
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyMode, setProxyMode] = useState<'direct' | 'http' | 'https' | 'socks5'>('socks5');
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState<number>(9050);
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const [changeIpUrl, setChangeIpUrl] = useState('');
  const [savedProxies, setSavedProxies] = useState<SavedProxy[]>([]);
  const [selectedSavedProxyId, setSelectedSavedProxyId] = useState<string>('');
  const [freeProxies, setFreeProxies] = useState<any[]>([]);
  const [loadingFreeProxies, setLoadingFreeProxies] = useState(false);
  const [selectedFreeProxyId, setSelectedFreeProxyId] = useState<string>('');

  // Proxy test and rotation state
  const [testingProxy, setTestingProxy] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    ip?: string;
    country?: string;
    city?: string;
    timezone?: string;
    error?: string;
  } | null>(null);
  const [rotatingProfileId, setRotatingProfileId] = useState<string | null>(null);

  // Import JSON drawer
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');

  // Cookie Drawer Modal
  const [cookieModalProfile, setCookieModalProfile] = useState<Profile | null>(null);
  const [cookieModalContent, setCookieModalContent] = useState('');
  const [cookieModalFormat, setCookieModalFormat] = useState<'json' | 'netscape'>('json');
  const [cookieImportText, setCookieImportText] = useState('');
  const [cookieStatusMsg, setCookieStatusMsg] = useState('');

  // Bulk Profile Creator state
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkPrefix, setBulkPrefix] = useState('Account');
  const [bulkGroup, setBulkGroup] = useState('Default');
  const [bulkOs, setBulkOs] = useState<'mac' | 'windows'>('mac');
  const [bulkBrowser, setBulkBrowser] = useState<'chrome' | 'edge' | 'brave'>('chrome');
  const [bulkProxiesText, setBulkProxiesText] = useState('');
  const [isBulkCreating, setIsBulkCreating] = useState(false);

  // Auto Updater State
  const [updateStatus, setUpdateStatus] = useState<any>({ status: 'idle' });
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Auto Updater listener
  useEffect(() => {
    if (window.browserAPI && (window.browserAPI as any).onUpdateStatusChanged) {
      const unsub = (window.browserAPI as any).onUpdateStatusChanged((status: any) => {
        setUpdateStatus(status);
        if (status.status !== 'checking') {
          setCheckingUpdate(false);
        }
      });
      return () => {
        if (unsub) unsub();
      };
    }
  }, []);

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

  // Load saved proxies & free proxies on mount
  useEffect(() => {
    if (window.browserAPI && (window.browserAPI as any).listSavedProxies) {
      (window.browserAPI as any).listSavedProxies().then((list: SavedProxy[]) => {
        setSavedProxies(list || []);
      });
    }

    if (window.browserAPI && (window.browserAPI as any).listFreeProxies) {
      setLoadingFreeProxies(true);
      (window.browserAPI as any).listFreeProxies()
        .then((freeList: any[]) => {
          setFreeProxies(freeList || []);
        })
        .catch(() => {})
        .finally(() => setLoadingFreeProxies(false));
    }
  }, []);

  const groups = Array.from(new Set(profiles.map((p) => (p as any).group || 'Default')));

  const filteredProfiles = profiles.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q ||
      (p.name || '').toLowerCase().includes(q) ||
      ((p as any).notes || '').toLowerCase().includes(q) ||
      (p.proxy?.host || '').toLowerCase().includes(q);
    const matchesOS = filterOS === 'all' || (p as any).os === filterOS;
    const pBrowser = (p as any).browserType || 'chrome';
    const matchesBrowser = filterBrowser === 'all' || pBrowser === filterBrowser;
    const pGroup = (p as any).group || 'Default';
    const matchesGroup = filterGroup === 'all' || pGroup === filterGroup;
    return matchesQuery && matchesOS && matchesBrowser && matchesGroup;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProfileIds(filteredProfiles.map((p) => p.id));
    } else {
      setSelectedProfileIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedProfileIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleBulkLaunch = async () => {
    for (const id of selectedProfileIds) {
      await handleLaunch(id);
    }
  };

  const handleBulkStop = async () => {
    for (const id of selectedProfileIds) {
      await handleStop(id);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Delete ${selectedProfileIds.length} selected profiles permanently?`)) {
      for (const id of selectedProfileIds) {
        await window.browserAPI.deleteProfile(id);
      }
      setSelectedProfileIds([]);
      onRefreshProfiles();
    }
  };

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

  const handleRotateProxy = async (profileId: string, url?: string) => {
    if (!url) {
      alert('No rotation / change IP URL configured for this proxy.');
      return;
    }
    setRotatingProfileId(profileId);
    try {
      const res = await (window.browserAPI as any).rotateProxyIp(url);
      if (res.success) {
        alert(`Proxy rotated successfully! Response: ${res.newIp || res.message}`);
      } else {
        alert(`Proxy rotation failed: ${res.message}`);
      }
    } catch (err: any) {
      alert(`Error rotating proxy: ${err.message}`);
    } finally {
      setRotatingProfileId(null);
    }
  };

  const handleWarmUpProfile = async (profileId: string) => {
    // Cookie Warm-up Bot: seeds trustworthy popular sites
    const warmupSites = [
      'https://www.wikipedia.org',
      'https://www.google.com',
      'https://www.bing.com',
      'https://www.reddit.com',
      'https://duckduckgo.com',
    ];

    if (window.browserAPI && (window.browserAPI as any).saveSavedSession) {
      try {
        await (window.browserAPI as any).saveSavedSession(profileId, {
          cookies: [],
          openUrls: warmupSites.slice(0, 3),
        });
        alert(`🔥 Cookie Warm-up initialized for this profile! Launching will visit high-reputation domains to seed authentic browsing cookies & history.`);
        await handleLaunch(profileId);
      } catch (err: any) {
        alert(`Could not start warm-up: ${err.message}`);
      }
    } else {
      await handleLaunch(profileId);
    }
  };

  const handleQuickLeakTest = async (profileId: string) => {
    // Quick IP Leak & Fingerprint Test
    if (window.browserAPI && (window.browserAPI as any).saveSavedSession) {
      try {
        await (window.browserAPI as any).saveSavedSession(profileId, {
          cookies: [],
          openUrls: ['https://whoer.net', 'https://iphey.com'],
        });
        await handleLaunch(profileId);
      } catch {
        await handleLaunch(profileId);
      }
    } else {
      await handleLaunch(profileId);
    }
  };

  const formatCookiesList = (cookies: any[], format: 'json' | 'netscape'): string => {
    if (format === 'json') {
      return JSON.stringify(cookies, null, 2);
    }
    const lines = [
      '# Netscape HTTP Cookie File',
      '# Generated by Multi Agent',
      '',
    ];
    for (const c of cookies) {
      const domain = c.domain?.startsWith('.') ? c.domain : `.${c.domain || 'localhost'}`;
      const flag = domain.startsWith('.') ? 'TRUE' : 'FALSE';
      const path = c.path || '/';
      const secure = c.secure ? 'TRUE' : 'FALSE';
      const expires = c.expirationDate ? Math.floor(c.expirationDate) : 0;
      lines.push(`${domain}\t${flag}\t${path}\t${secure}\t${expires}\t${c.name}\t${c.value}`);
    }
    return lines.join('\n');
  };

  const handleOpenCookieModal = async (profile: Profile) => {
    setCookieModalProfile(profile);
    setCookieStatusMsg('');
    setCookieImportText('');
    setCookieModalFormat('json');
    if (window.browserAPI) {
      if ((window.browserAPI as any).getSavedSession) {
        const session = await (window.browserAPI as any).getSavedSession(profile.id);
        if (session?.cookies && session.cookies.length > 0) {
          setCookieModalContent(formatCookiesList(session.cookies, 'json'));
          return;
        }
      }
      if (window.browserAPI.exportCookies) {
        const data = await window.browserAPI.exportCookies(profile.id, 'json');
        setCookieModalContent(data);
      }
    }
  };

  const handleExportCookiesFormat = async (format: 'json' | 'netscape') => {
    setCookieModalFormat(format);
    if (!cookieModalProfile || !window.browserAPI) return;
    if ((window.browserAPI as any).getSavedSession) {
      const session = await (window.browserAPI as any).getSavedSession(cookieModalProfile.id);
      if (session?.cookies && session.cookies.length > 0) {
        setCookieModalContent(formatCookiesList(session.cookies, format));
        return;
      }
    }
    if (window.browserAPI.exportCookies) {
      const data = await window.browserAPI.exportCookies(cookieModalProfile.id, format);
      setCookieModalContent(data);
    }
  };

  const handleDownloadCookieFile = () => {
    if (!cookieModalProfile) return;
    const ext = cookieModalFormat === 'json' ? 'json' : 'txt';
    const blob = new Blob([cookieModalContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cookies-${cookieModalProfile.name.replace(/\s+/g, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCookiesSubmit = async () => {
    if (!cookieModalProfile || !cookieImportText.trim() || !window.browserAPI) return;
    try {
      const result = await window.browserAPI.importCookies(cookieModalProfile.id, cookieImportText.trim());
      try {
        const parsed = JSON.parse(cookieImportText.trim());
        if (Array.isArray(parsed) && (window.browserAPI as any).saveSavedSession) {
          await (window.browserAPI as any).saveSavedSession(cookieModalProfile.id, {
            cookies: parsed,
            openUrls: [],
          });
        }
      } catch {}

      setCookieStatusMsg(`✓ Imported ${result.imported} cookies (${result.errors} errors)`);
      setCookieImportText('');
      await handleExportCookiesFormat(cookieModalFormat);
    } catch (err: any) {
      setCookieStatusMsg(`✗ Import failed: ${err.message}`);
    }
  };

  const handleBulkCreateSubmit = async () => {
    if (!isAuthenticated || !window.browserAPI || isBulkCreating) return;
    setIsBulkCreating(true);

    try {
      // Parse optional proxy lines: host:port or host:port:user:pass or socks5://...
      const rawLines = bulkProxiesText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const parsedProxies = rawLines.map((line) => {
        // Check url pattern
        try {
          if (line.includes('://')) {
            const u = new URL(line);
            return {
              enabled: true,
              mode: (u.protocol.replace(':', '') as any) || 'socks5',
              host: u.hostname,
              port: Number(u.port) || 8080,
              username: u.username || undefined,
              password: u.password || undefined,
            };
          }
        } catch {}

        // Fallback to host:port[:user:pass]
        const parts = line.split(':');
        if (parts.length >= 2) {
          return {
            enabled: true,
            mode: 'socks5' as const,
            host: parts[0],
            port: Number(parts[1]) || 8080,
            username: parts[2] || undefined,
            password: parts[3] || undefined,
          };
        }
        return null;
      }).filter(Boolean);

      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

      for (let i = 1; i <= bulkCount; i++) {
        const assignedProxy = parsedProxies.length > 0
          ? parsedProxies[(i - 1) % parsedProxies.length]
          : { enabled: false, mode: 'direct' as const, host: '', port: 8080 };

        const profileName = `${bulkPrefix.trim() || 'Account'} ${i}`;
        const color = colors[(i - 1) % colors.length];

        await window.browserAPI.createProfile({
          name: profileName,
          isTemporary: false,
          privacyLevel: 'balanced',
          webrtcPolicy: 'default_public_interface_only',
          proxy: assignedProxy as any,
          os: bulkOs,
          browserType: bulkBrowser,
          browserVersion: '150.0.0.0',
          notes: `Batch created in folder: ${bulkGroup}`,
          group: bulkGroup.trim() || 'Default',
          color,
        } as any);
      }

      setShowBulkCreateModal(false);
      setBulkProxiesText('');
      onRefreshProfiles();
    } catch (err: any) {
      alert(`Bulk create encountered an issue: ${err.message}`);
    } finally {
      setIsBulkCreating(false);
    }
  };

  const handleOpenCreate = () => {
    if (!isAuthenticated) return;
    setEditingProfileId(null);
    setName(`Profile ${profiles.length + 1}`);
    setGroup('Default');
    setOs('mac');
    setBrowserType('chrome');
    setBrowserVersion('150.0.0.0');
    setCustomUserAgent('');
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
    setChangeIpUrl('');
    setSelectedSavedProxyId('');
    setProxyTestResult(null);
    setRemoteDebuggingPort('');
    setEditorTab('general');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (p: Profile) => {
    if (!isAuthenticated) return;
    setEditingProfileId(p.id);
    setEditorTab('general');
    setName(p.name);
    setGroup((p as any).group || 'Default');
    setOs((p as any).os || 'mac');
    setBrowserType((p as any).browserType || 'chrome');
    setBrowserVersion((p as any).browserVersion || '150.0.0.0');
    setCustomUserAgent(p.customUserAgent || '');
    setColor(p.color || '#3b82f6');
    setNotes((p as any).notes || '');
    setPrivacyLevel(p.privacyLevel);
    setWebrtcPolicy(p.webrtcPolicy);
    setIsTemporary(p.isTemporary);
    setRemoteDebuggingPort((p as any).remoteDebuggingPort || '');
    setProxyEnabled(p.proxy.enabled);
    setProxyMode(p.proxy.mode);
    setProxyHost(p.proxy.host);
    setProxyPort(p.proxy.port);
    setProxyUsername(p.proxy.username || '');
    setProxyPassword(p.proxy.password || '');
    setChangeIpUrl((p.proxy as any).changeIpUrl || '');
    setSelectedSavedProxyId('');
    setProxyTestResult(null);
    setIsCreateOpen(true);
  };

  const handleSelectSavedProxy = (proxyId: string) => {
    setSelectedSavedProxyId(proxyId);
    if (!proxyId) return;
    const found = savedProxies.find((p) => p.id === proxyId);
    if (found) {
      setProxyEnabled(true);
      setProxyMode(found.mode);
      setProxyHost(found.host);
      setProxyPort(found.port);
      setProxyUsername(found.username || '');
      setProxyPassword(found.password || '');
      setChangeIpUrl(found.changeIpUrl || '');
    }
  };

  const handleRefreshFreeProxies = async () => {
    if (!window.browserAPI || !(window.browserAPI as any).listFreeProxies || loadingFreeProxies) return;
    setLoadingFreeProxies(true);
    try {
      const list = await (window.browserAPI as any).listFreeProxies();
      setFreeProxies(list || []);
      setSelectedFreeProxyId('');
    } catch (err: any) {
      alert(`Could not refresh free proxies: ${err.message}`);
    } finally {
      setLoadingFreeProxies(false);
    }
  };

  const handleSelectFreeProxy = async (freeId: string) => {
    setSelectedFreeProxyId(freeId);
    if (!freeId) return;
    const found = freeProxies.find((fp) => fp.id === freeId);
    if (found) {
      setProxyEnabled(true);
      const mode = found.protocol === 'http' || found.protocol === 'https' ? 'http' : 'socks5';
      setProxyMode(mode);
      setProxyHost(found.ip);
      setProxyPort(found.port);
      setProxyUsername('');
      setProxyPassword('');
      setChangeIpUrl('');
      setSelectedSavedProxyId('');
      setProxyTestResult(null);

      // Auto test connection immediately so the user knows live status
      if (window.browserAPI) {
        setTestingProxy(true);
        try {
          const res = await window.browserAPI.testProxy({
            enabled: true,
            mode,
            host: found.ip,
            port: found.port,
          });
          setProxyTestResult(res);
        } catch (e: any) {
          setProxyTestResult({ success: false, error: e.message });
        } finally {
          setTestingProxy(false);
        }
      }
    }
  };

  const handleSaveCurrentProxyToPool = async () => {
    if (!proxyHost.trim() || !window.browserAPI) return;
    const newProxy: SavedProxy = {
      id: `proxy-${Date.now()}`,
      name: `${proxyHost}:${proxyPort}`,
      mode: proxyMode === 'direct' ? 'socks5' : proxyMode,
      host: proxyHost.trim(),
      port: Number(proxyPort) || 8080,
      username: proxyUsername ? proxyUsername.trim() : undefined,
      password: proxyPassword ? proxyPassword.trim() : undefined,
      changeIpUrl: changeIpUrl ? changeIpUrl.trim() : undefined,
      group: group || 'Default',
      createdAt: Date.now(),
    };
    await (window.browserAPI as any).saveProxy(newProxy);
    const updated = await (window.browserAPI as any).listSavedProxies();
    setSavedProxies(updated);
    alert('Proxy saved to Proxy Pool!');
  };

  const handleSaveProfile = async (andLaunch: boolean = false) => {
    if (!isAuthenticated || !name.trim() || !window.browserAPI) return;

    const proxyData: ProxyConfig = {
      enabled: proxyEnabled,
      mode: proxyEnabled ? proxyMode : 'direct',
      host: proxyHost.trim(),
      port: Number(proxyPort) || 8080,
      username: proxyUsername ? proxyUsername.trim() : undefined,
      password: proxyPassword ? proxyPassword.trim() : undefined,
      changeIpUrl: changeIpUrl ? changeIpUrl.trim() : undefined,
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
        customUserAgent,
        notes,
        group,
        color,
        remoteDebuggingPort: remoteDebuggingPort ? Number(remoteDebuggingPort) : undefined,
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
        customUserAgent,
        notes,
        group,
        color,
        remoteDebuggingPort: remoteDebuggingPort ? Number(remoteDebuggingPort) : undefined,
      } as any);

      if (andLaunch && created && (window.browserAPI as any).launchProfile) {
        await handleLaunch(created.id);
      }
    }

    setIsCreateOpen(false);
    onRefreshProfiles();
  };

  const handleCheckUpdate = async () => {
    if (!window.browserAPI || !(window.browserAPI as any).checkForUpdates) return;
    setCheckingUpdate(true);
    try {
      const res = await (window.browserAPI as any).checkForUpdates();
      if (!res.success && res.error) {
        setUpdateStatus({ status: 'error', message: res.error });
      }
    } catch (e: any) {
      setUpdateStatus({ status: 'error', message: e.message });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!window.browserAPI || !(window.browserAPI as any).downloadUpdate) return;
    try {
      await (window.browserAPI as any).downloadUpdate();
    } catch (e: any) {
      setUpdateStatus({ status: 'error', message: e.message });
    }
  };

  const handleInstallUpdate = async () => {
    if (!window.browserAPI || !(window.browserAPI as any).installUpdate) return;
    try {
      await (window.browserAPI as any).installUpdate();
    } catch (e: any) {
      setUpdateStatus({ status: 'error', message: e.message });
    }
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
    if (!isAuthenticated) return;
    if (confirm('Delete this profile permanently and wipe all stored cookies & partition data?')) {
      await window.browserAPI.deleteProfile(profileId);
      onRefreshProfiles();
    }
  };

  const handleDuplicate = async (profileId: string) => {
    if (!isAuthenticated) return;
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
    if (!isAuthenticated || !importJson.trim()) return;
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
                  Profiles
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
                  {runningProfileIds.length} running · {profiles.length} total
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              disabled={!isAuthenticated}
              onClick={() => setShowImport(!showImport)}
              title={!isAuthenticated ? 'Sign in to import profiles' : 'Import Profile'}
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
              disabled={!isAuthenticated}
              onClick={() => setShowBulkCreateModal(true)}
              title={!isAuthenticated ? 'Sign in to bulk create profiles' : 'Bulk Create Profiles'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                backgroundColor: '#222533',
                border: '1px solid #33384c',
                borderRadius: 8,
                color: '#38bdf8',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <Layers size={14} />
              Bulk Create
            </button>

            <button
              onClick={handleCheckUpdate}
              disabled={checkingUpdate || updateStatus.status === 'downloading'}
              title="Check for software updates"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                backgroundColor: updateStatus.status === 'available' ? '#047857' : updateStatus.status === 'downloaded' ? '#2563eb' : '#222533',
                border: `1px solid ${updateStatus.status === 'available' ? '#10b981' : updateStatus.status === 'downloaded' ? '#3b82f6' : '#33384c'}`,
                borderRadius: 8,
                color: updateStatus.status === 'available' ? '#34d399' : updateStatus.status === 'downloaded' ? '#60a5fa' : '#e2e4e9',
                fontSize: 12,
                fontWeight: updateStatus.status === 'available' || updateStatus.status === 'downloaded' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {checkingUpdate ? (
                <Loader2 size={14} className="animate-spin" />
              ) : updateStatus.status === 'available' ? (
                <ArrowDownCircle size={14} />
              ) : updateStatus.status === 'downloaded' ? (
                <CheckCircle size={14} />
              ) : (
                <RefreshCw size={14} />
              )}
              {checkingUpdate
                ? 'Checking...'
                : updateStatus.status === 'available'
                ? `Update v${updateStatus.version}`
                : updateStatus.status === 'downloading'
                ? `Downloading (${updateStatus.percent}%)`
                : updateStatus.status === 'downloaded'
                ? 'Install & Restart'
                : 'Updates'}
            </button>

            <button
              disabled={!isAuthenticated}
              onClick={handleOpenCreate}
              title={!isAuthenticated ? 'Sign in to create profiles' : 'Create Profile'}
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

        {/* Update Notification Banner */}
        {updateStatus.status !== 'idle' && (
          <div
            style={{
              padding: '10px 24px',
              backgroundColor:
                updateStatus.status === 'downloaded'
                  ? 'rgba(37, 99, 235, 0.15)'
                  : updateStatus.status === 'available' || updateStatus.status === 'downloading'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : updateStatus.status === 'error'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(51, 65, 85, 0.25)',
              borderBottom: `1px solid ${
                updateStatus.status === 'downloaded'
                  ? '#3b82f640'
                  : updateStatus.status === 'available' || updateStatus.status === 'downloading'
                  ? '#10b98140'
                  : updateStatus.status === 'error'
                  ? '#ef444440'
                  : '#334155'
              }`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
              {updateStatus.status === 'available' && (
                <>
                  <ArrowDownCircle size={15} color="#34d399" />
                  <span style={{ color: '#ffffff', fontWeight: 600 }}>
                    A new version (v{updateStatus.version}) is available!
                  </span>
                </>
              )}
              {updateStatus.status === 'downloading' && (
                <>
                  <Loader2 size={15} color="#34d399" className="animate-spin" />
                  <span style={{ color: '#ffffff' }}>
                    Downloading update: <strong>{updateStatus.percent}%</strong>
                  </span>
                </>
              )}
              {updateStatus.status === 'downloaded' && (
                <>
                  <CheckCircle size={15} color="#60a5fa" />
                  <span style={{ color: '#ffffff', fontWeight: 600 }}>
                    Update v{updateStatus.version} is ready to install!
                  </span>
                </>
              )}
              {updateStatus.status === 'not-available' && (
                <>
                  <CheckCircle size={15} color="#94a3b8" />
                  <span style={{ color: '#cbd5e1' }}>
                    Multi Agent is up to date (current latest version).
                  </span>
                </>
              )}
              {updateStatus.status === 'error' && (
                <>
                  <AlertCircle size={15} color="#f87171" />
                  <span style={{ color: '#fca5a5' }}>
                    Update check: {updateStatus.message}
                  </span>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {updateStatus.status === 'available' && (
                <button
                  type="button"
                  onClick={handleDownloadUpdate}
                  style={{
                    padding: '5px 12px',
                    backgroundColor: '#10b981',
                    border: 'none',
                    borderRadius: 6,
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Download Now
                </button>
              )}
              {updateStatus.status === 'downloaded' && (
                <button
                  type="button"
                  onClick={handleInstallUpdate}
                  style={{
                    padding: '5px 14px',
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    borderRadius: 6,
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  Restart & Install
                </button>
              )}
              <button
                type="button"
                onClick={() => setUpdateStatus({ status: 'idle' })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

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
              <span style={{ fontSize: 12, color: '#8b92a2', marginRight: 2 }}>Folder:</span>
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                style={{
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: '1px solid #33384c',
                  backgroundColor: '#222533',
                  color: '#ffffff',
                  fontSize: 11,
                  outline: 'none',
                }}
              >
                <option value="all">All Folders</option>
                {groups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

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

        {/* Bulk Actions Banner */}
        {selectedProfileIds.length > 0 && (
          <div
            style={{
              padding: '10px 24px',
              backgroundColor: '#1e2438',
              borderBottom: '1px solid #333d60',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600 }}>
                {selectedProfileIds.length} profiles selected
              </span>
              <button
                onClick={() => setSelectedProfileIds([])}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: 11,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear selection
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={handleBulkLaunch}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  backgroundColor: '#10b981',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Play size={12} fill="#fff" />
                Launch Selected
              </button>

              <button
                onClick={handleBulkStop}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  backgroundColor: '#f59e0b',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Square size={12} fill="#fff" />
                Stop Selected
              </button>

              <button
                onClick={handleBulkDelete}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  backgroundColor: '#ef4444',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={12} />
                Delete Selected
              </button>
            </div>
          </div>
        )}

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
                <th style={{ padding: '12px 16px', width: 40 }}>
                  <input
                    type="checkbox"
                    checked={filteredProfiles.length > 0 && selectedProfileIds.length === filteredProfiles.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th style={{ padding: '12px 16px' }}>Profile Name</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Folder</th>
                <th style={{ padding: '12px 16px' }}>Browser Engine & Version</th>
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
                const profileVersion = (p as any).browserVersion || '150.0.0.0';
                const isSelected = selectedProfileIds.includes(p.id);

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #20222f',
                      transition: 'background 0.15s ease',
                      backgroundColor: isRunning ? 'rgba(16, 185, 129, 0.04)' : isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isRunning ? 'rgba(16, 185, 129, 0.08)' : '#191b26')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isRunning ? 'rgba(16, 185, 129, 0.04)' : isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent')}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '14px 16px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(p.id)}
                      />
                    </td>

                    {/* Name & Tag */}
                    <td style={{ padding: '14px 16px' }}>
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

                    {/* Folder */}
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          backgroundColor: '#1e2433',
                          color: '#93c5fd',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontWeight: 500,
                          border: '1px solid #2e3a59',
                        }}
                      >
                        {(p as any).group || 'Default'}
                      </span>
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

                    {/* Proxy & Rotate IP */}
                    <td style={{ padding: '14px 16px' }}>
                      {hasProxy ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                          {(p.proxy as any).changeIpUrl && (
                            <button
                              onClick={() => handleRotateProxy(p.id, (p.proxy as any).changeIpUrl)}
                              disabled={rotatingProfileId === p.id}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: 5,
                                color: '#38bdf8',
                                padding: '3px 6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 10,
                              }}
                              title="Rotate IP (Change IP URL)"
                            >
                              {rotatingProfileId === p.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <RotateCw size={11} />
                              )}
                              Rotate
                            </button>
                          )}
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
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
                          onClick={() => handleOpenCookieModal(p)}
                          style={{
                            background: '#232634',
                            border: '1px solid #32374b',
                            borderRadius: 6,
                            color: '#f59e0b',
                            padding: 6,
                            cursor: 'pointer',
                          }}
                          title="Manage Cookies (Import / Export)"
                        >
                          <Cookie size={14} />
                        </button>

                        <button
                          onClick={() => handleWarmUpProfile(p.id)}
                          style={{
                            background: '#232634',
                            border: '1px solid #32374b',
                            borderRadius: 6,
                            color: '#f97316',
                            padding: 6,
                            cursor: 'pointer',
                          }}
                          title="Cookie Warming Bot (Seed history & cookies on popular domains)"
                        >
                          <Flame size={14} />
                        </button>

                        <button
                          onClick={() => handleQuickLeakTest(p.id)}
                          style={{
                            background: '#232634',
                            border: '1px solid #32374b',
                            borderRadius: 6,
                            color: '#06b6d4',
                            padding: 6,
                            cursor: 'pointer',
                          }}
                          title="Quick IP & Fingerprint Leak Test (whoer.net / iphey.com)"
                        >
                          <Compass size={14} />
                        </button>

                        <button
                          disabled={!isAuthenticated}
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
                          disabled={!isAuthenticated}
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
                          disabled={!isAuthenticated}
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
              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '60px 24px', textAlign: 'center', color: '#8b92a2' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#1f222e', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #2d3345' }}>
                        <User size={24} color="#60a5fa" />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e4e9', marginBottom: 4 }}>
                          {searchQuery || filterBrowser !== 'all' || filterOS !== 'all' ? 'No matching profiles found' : 'No profiles created yet'}
                        </div>
                        <div style={{ fontSize: 12, color: '#9ba1b0' }}>
                          {searchQuery || filterBrowser !== 'all' || filterOS !== 'all' ? 'Try adjusting your search query or filters.' : 'Click "New Profile" to create your first isolated browser profile.'}
                        </div>
                      </div>
                      {!searchQuery && filterBrowser === 'all' && filterOS === 'all' && (
                        <button
                          disabled={!isAuthenticated}
                          onClick={handleOpenCreate}
                          style={{
                            marginTop: 6,
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
                          }}
                        >
                          <Plus size={15} />
                          Create Profile
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
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
            backgroundColor: '#0d0f17',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              minHeight: 0,
              backgroundColor: '#12141e',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Editor Header */}
            <div
              style={{
                padding: '16px 28px',
                borderBottom: '1px solid #232738',
                backgroundColor: '#151824',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: editingProfileId ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    border: `1px solid ${editingProfileId ? '#3b82f640' : '#10b98140'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: editingProfileId ? '#60a5fa' : '#34d399',
                  }}
                >
                  {editingProfileId ? <Edit2 size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    {editingProfileId ? 'Edit Browser Profile' : 'Create New Profile'}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#82899d', marginTop: 2 }}>
                    {editingProfileId ? `Customizing configuration for "${name || 'Unnamed'}"` : 'Configure isolated fingerprint, network proxy, and automation'}
                  </p>
                </div>
              </div>

              {/* Navigation Tabs Pill Bar */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#0d0e15',
                  padding: 4,
                  borderRadius: 10,
                  border: '1px solid #232738',
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditorTab('general')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 7,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: editorTab === 'general' ? 600 : 500,
                    cursor: 'pointer',
                    backgroundColor: editorTab === 'general' ? '#25293d' : 'transparent',
                    color: editorTab === 'general' ? '#ffffff' : '#8890a5',
                    boxShadow: editorTab === 'general' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <User size={14} />
                  General
                </button>

                <button
                  type="button"
                  onClick={() => setEditorTab('proxy')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 7,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: editorTab === 'proxy' ? 600 : 500,
                    cursor: 'pointer',
                    backgroundColor: editorTab === 'proxy' ? '#25293d' : 'transparent',
                    color: editorTab === 'proxy' ? '#ffffff' : '#8890a5',
                    boxShadow: editorTab === 'proxy' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Globe size={14} />
                  Proxy & Network
                  {proxyEnabled && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        display: 'inline-block',
                      }}
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setEditorTab('privacy')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 7,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: editorTab === 'privacy' ? 600 : 500,
                    cursor: 'pointer',
                    backgroundColor: editorTab === 'privacy' ? '#25293d' : 'transparent',
                    color: editorTab === 'privacy' ? '#ffffff' : '#8890a5',
                    boxShadow: editorTab === 'privacy' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Shield size={14} />
                  Privacy & Automation
                </button>
              </div>

              <button
                disabled={!isAuthenticated}
                onClick={() => setIsCreateOpen(false)}
                style={{
                  background: 'none',
                  border: '1px solid #282c3f',
                  borderRadius: 8,
                  padding: 6,
                  color: '#9ba1b0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Close Editor"
              >
                <X size={16} />
              </button>
            </div>

            {/* Editor Body Content Area */}
            <div style={{ flex: 1, minHeight: 0, padding: '24px 28px', overflowY: 'auto' }}>
              <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* TAB 1: GENERAL SETTINGS */}
                {editorTab === 'general' && (
                  <>
                    {/* Basic Info Card */}
                    <div
                      style={{
                        padding: 18,
                        backgroundColor: '#171a26',
                        border: '1px solid #282d40',
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={15} color="#3b82f6" />
                        Basic Information
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ba1b0', marginBottom: 6 }}>
                            Profile Name *
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Amazon Store 1, Client Alpha"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              backgroundColor: '#0e1017',
                              border: '1px solid #2c3245',
                              borderRadius: 8,
                              color: '#ffffff',
                              fontSize: 13,
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ba1b0', marginBottom: 6 }}>
                            Folder / Group
                          </label>
                          <input
                            type="text"
                            value={group}
                            onChange={(e) => setGroup(e.target.value)}
                            placeholder="Default"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              backgroundColor: '#0e1017',
                              border: '1px solid #2c3245',
                              borderRadius: 8,
                              color: '#ffffff',
                              fontSize: 13,
                              boxSizing: 'border-box',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>

                      {/* Color Tag Swatch Picker */}
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ba1b0', marginBottom: 8 }}>
                          Profile Color Tag
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {[
                            '#3b82f6', // blue
                            '#10b981', // emerald
                            '#8b5cf6', // purple
                            '#f59e0b', // amber
                            '#ec4899', // pink
                            '#06b6d4', // cyan
                            '#ef4444', // red
                            '#64748b', // slate
                          ].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setColor(c)}
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                backgroundColor: c,
                                border: color === c ? '2px solid #ffffff' : '2px solid transparent',
                                outline: color === c ? `2px solid ${c}` : 'none',
                                cursor: 'pointer',
                                transition: 'transform 0.1s ease',
                                transform: color === c ? 'scale(1.15)' : 'scale(1)',
                              }}
                            />
                          ))}
                          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>
                            Used for badge identifiers
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Environment & OS Platform Card */}
                    <div
                      style={{
                        padding: 18,
                        backgroundColor: '#171a26',
                        border: '1px solid #282d40',
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Monitor size={15} color="#10b981" />
                        Operating System Simulation
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div
                          onClick={() => setOs('mac')}
                          style={{
                            padding: '14px 16px',
                            borderRadius: 10,
                            backgroundColor: os === 'mac' ? '#1c2236' : '#0e1017',
                            border: `1.5px solid ${os === 'mac' ? '#3b82f6' : '#282d40'}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 8,
                              backgroundColor: os === 'mac' ? '#3b82f625' : '#1e2230',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: os === 'mac' ? '#60a5fa' : '#94a3b8',
                            }}
                          >
                            <Apple size={20} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>macOS</div>
                            <div style={{ fontSize: 11, color: '#82899d' }}>Intel & Apple Silicon Core</div>
                          </div>
                        </div>

                        <div
                          onClick={() => setOs('windows')}
                          style={{
                            padding: '14px 16px',
                            borderRadius: 10,
                            backgroundColor: os === 'windows' ? '#1c2236' : '#0e1017',
                            border: `1.5px solid ${os === 'windows' ? '#3b82f6' : '#282d40'}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 8,
                              backgroundColor: os === 'windows' ? '#3b82f625' : '#1e2230',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: os === 'windows' ? '#60a5fa' : '#94a3b8',
                            }}
                          >
                            <Monitor size={20} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Windows</div>
                            <div style={{ fontSize: 11, color: '#82899d' }}>Windows 10 / 11 Native Architecture</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Browser Engine & Version Card */}
                    <div
                      style={{
                        padding: 18,
                        backgroundColor: '#171a26',
                        border: '1px solid #282d40',
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Globe size={15} color="#f59e0b" />
                        Browser Engine & Architecture
                      </div>

                      {/* Engine Selector Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {[
                          { id: 'chrome', label: 'Google Chrome', tag: 'Standard' },
                          { id: 'brave', label: 'Brave Browser', tag: 'Shields' },
                          { id: 'edge', label: 'Microsoft Edge', tag: 'Enterprise' },
                        ].map((b) => (
                          <div
                            key={b.id}
                            onClick={() => setBrowserType(b.id as any)}
                            style={{
                              padding: '12px 14px',
                              borderRadius: 8,
                              backgroundColor: browserType === b.id ? '#1e2338' : '#0e1017',
                              border: `1.5px solid ${browserType === b.id ? '#f59e0b' : '#282d40'}`,
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>{b.label}</span>
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  backgroundColor: browserType === b.id ? 'rgba(245, 158, 11, 0.2)' : '#232738',
                                  color: browserType === b.id ? '#fcd34d' : '#8890a5',
                                }}
                              >
                                {b.tag}
                              </span>
                            </div>
                            <span style={{ fontSize: 11, color: '#82899d' }}>Chromium runtime base</span>
                          </div>
                        ))}
                      </div>

                      {/* Browser Version & User-Agent */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, alignItems: 'flex-start' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ba1b0', marginBottom: 6 }}>
                            Browser Version
                          </label>
                          <input
                            type="text"
                            maxLength={64}
                            placeholder="150.0.0.0"
                            value={browserVersion}
                            onChange={(e) => setBrowserVersion(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              backgroundColor: '#0e1017',
                              border: '1px solid #2c3245',
                              borderRadius: 8,
                              color: '#ffffff',
                              fontSize: 13,
                              boxSizing: 'border-box',
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div>
                          <label htmlFor="custom-user-agent" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ba1b0', marginBottom: 6 }}>
                            Custom User-Agent (optional)
                          </label>
                          <input
                            id="custom-user-agent"
                            type="text"
                            maxLength={512}
                            value={customUserAgent}
                            onChange={(event) => setCustomUserAgent(event.target.value)}
                            placeholder="Leave blank to use the selected browser & version"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              backgroundColor: '#0e1017',
                              border: '1px solid #2c3245',
                              borderRadius: 8,
                              color: '#ffffff',
                              fontSize: 12,
                              boxSizing: 'border-box',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>

                      {/* User-Agent Preview Box */}
                      <div
                        style={{
                          backgroundColor: '#0e1017',
                          padding: '12px 16px',
                          borderRadius: 8,
                          border: '1px solid #24293c',
                          fontSize: 11,
                          lineHeight: '1.5',
                        }}
                      >
                        <div style={{ color: '#60a5fa', fontWeight: 600, marginBottom: 4 }}>
                          ⚡ Effective User-Agent String:
                        </div>
                        <div style={{ color: '#cbd5e1', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {customUserAgent.trim() || getBrowserUserAgent(browserType, browserVersion, os)}
                        </div>
                      </div>

                      {/* Notes / Tags */}
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ba1b0', marginBottom: 6 }}>
                          Notes / Description
                        </label>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Optional notes, account recovery emails, credentials, or target marketplace..."
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            backgroundColor: '#0e1017',
                            border: '1px solid #2c3245',
                            borderRadius: 8,
                            color: '#ffffff',
                            fontSize: 12,
                            outline: 'none',
                            boxSizing: 'border-box',
                            resize: 'none',
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* TAB 2: PROXY & NETWORK */}
                {editorTab === 'proxy' && (
                  <div
                    style={{
                      padding: 20,
                      backgroundColor: '#171a26',
                      border: '1px solid #282d40',
                      borderRadius: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 18,
                    }}
                  >
                    {/* Enable Proxy Master Toggle */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: 16,
                        borderBottom: '1px solid #252a3d',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>Dedicated Proxy Connection</div>
                        <div style={{ fontSize: 12, color: '#82899d', marginTop: 2 }}>
                          Route all traffic through SOCKS5, HTTP, or a Live Free Hub proxy
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {proxyEnabled && (
                          <button
                            type="button"
                            onClick={handleTestProxy}
                            disabled={testingProxy || !proxyHost.trim()}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 12px',
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: 7,
                              color: '#38bdf8',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {testingProxy ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
                            {testingProxy ? 'Checking...' : 'Test Connection'}
                          </button>
                        )}

                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={proxyEnabled}
                            onChange={(e) => setProxyEnabled(e.target.checked)}
                            style={{ width: 18, height: 18, accentColor: '#3b82f6', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 600, color: proxyEnabled ? '#60a5fa' : '#94a3b8' }}>
                            {proxyEnabled ? 'Proxy Enabled' : 'Direct Connection'}
                          </span>
                        </label>
                      </div>
                    </div>

                    {proxyEnabled && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* 1. Free Proxy Hub Panel */}
                        <div
                          style={{
                            padding: 14,
                            borderRadius: 10,
                            backgroundColor: 'rgba(16, 185, 129, 0.06)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>
                                🌐 Free Proxy Hub
                              </span>
                              <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', fontWeight: 600 }}>
                                {freeProxies.length} Verified Online
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={handleRefreshFreeProxies}
                              disabled={loadingFreeProxies}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '5px 11px',
                                backgroundColor: '#064e3b',
                                border: '1px solid #059669',
                                borderRadius: 6,
                                color: '#34d399',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                              title="Scan and load brand-new connectable proxies"
                            >
                              {loadingFreeProxies ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
                              {loadingFreeProxies ? 'Verifying...' : 'Find New Proxies'}
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <select
                              value={selectedFreeProxyId}
                              onChange={(e) => handleSelectFreeProxy(e.target.value)}
                              disabled={loadingFreeProxies}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                backgroundColor: '#0c1412',
                                border: '1px solid #059669',
                                borderRadius: 7,
                                color: '#34d399',
                                fontSize: 12,
                                outline: 'none',
                              }}
                            >
                              <option value="">
                                {loadingFreeProxies ? 'Testing & fetching live proxies...' : '-- Select Connectable Free Proxy (One-Click) --'}
                              </option>
                              {freeProxies.map((fp) => {
                                const locationLabel = fp.city ? `${fp.country} (${fp.city})` : fp.country;
                                return (
                                  <option key={fp.id} value={fp.id}>
                                    [{fp.countryCode || '??'}] {locationLabel} - {fp.protocol.toUpperCase()} ({fp.ip}:{fp.port}) · ⚡ {fp.speed}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>

                        {/* 2. Reusable Saved Proxy Pool */}
                        {savedProxies.length > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '10px 14px',
                              backgroundColor: '#121420',
                              borderRadius: 8,
                              border: '1px solid #282d40',
                            }}
                          >
                            <Bookmark size={15} color="#38bdf8" />
                            <span style={{ fontSize: 12, color: '#9ba1b0', fontWeight: 500 }}>Saved Proxy Pool:</span>
                            <select
                              value={selectedSavedProxyId}
                              onChange={(e) => handleSelectSavedProxy(e.target.value)}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                backgroundColor: '#0e1017',
                                border: '1px solid #2f3448',
                                borderRadius: 6,
                                color: '#38bdf8',
                                fontSize: 12,
                              }}
                            >
                              <option value="">-- Choose saved proxy --</option>
                              {savedProxies.map((sp) => (
                                <option key={sp.id} value={sp.id}>
                                  {sp.name} ({sp.mode.toUpperCase()} - {sp.host}:{sp.port})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* 3. Manual Proxy Configuration Inputs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ width: 120 }}>
                              <label style={{ display: 'block', fontSize: 11, color: '#8890a5', marginBottom: 4 }}>
                                Protocol
                              </label>
                              <select
                                value={proxyMode}
                                onChange={(e: any) => setProxyMode(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '9px 10px',
                                  backgroundColor: '#0e1017',
                                  border: '1px solid #2c3245',
                                  borderRadius: 8,
                                  color: '#ffffff',
                                  fontSize: 12,
                                }}
                              >
                                <option value="socks5">SOCKS5</option>
                                <option value="http">HTTP</option>
                                <option value="https">HTTPS</option>
                              </select>
                            </div>

                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', fontSize: 11, color: '#8890a5', marginBottom: 4 }}>
                                Proxy Host (IP or Domain)
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 192.168.1.1 or proxy.example.com"
                                value={proxyHost}
                                onChange={(e) => setProxyHost(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '9px 12px',
                                  backgroundColor: '#0e1017',
                                  border: '1px solid #2c3245',
                                  borderRadius: 8,
                                  color: '#ffffff',
                                  fontSize: 12,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>

                            <div style={{ width: 100 }}>
                              <label style={{ display: 'block', fontSize: 11, color: '#8890a5', marginBottom: 4 }}>
                                Port
                              </label>
                              <input
                                type="number"
                                placeholder="Port"
                                value={proxyPort}
                                onChange={(e) => setProxyPort(Number(e.target.value))}
                                style={{
                                  width: '100%',
                                  padding: '9px 10px',
                                  backgroundColor: '#0e1017',
                                  border: '1px solid #2c3245',
                                  borderRadius: 8,
                                  color: '#ffffff',
                                  fontSize: 12,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: '#8890a5', marginBottom: 4 }}>
                                Proxy Username (optional)
                              </label>
                              <input
                                type="text"
                                placeholder="Username"
                                value={proxyUsername}
                                onChange={(e) => setProxyUsername(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '9px 12px',
                                  backgroundColor: '#0e1017',
                                  border: '1px solid #2c3245',
                                  borderRadius: 8,
                                  color: '#ffffff',
                                  fontSize: 12,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: '#8890a5', marginBottom: 4 }}>
                                Proxy Password (optional)
                              </label>
                              <input
                                type="password"
                                placeholder="Password"
                                value={proxyPassword}
                                onChange={(e) => setProxyPassword(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '9px 12px',
                                  backgroundColor: '#0e1017',
                                  border: '1px solid #2c3245',
                                  borderRadius: 8,
                                  color: '#ffffff',
                                  fontSize: 12,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>
                          </div>

                          {/* Dynamic IP Rotation URL & Save to Pool */}
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                placeholder="Rotation / Change IP URL (e.g. http://proxy-provider.com/rotate?key=xxx)"
                                value={changeIpUrl}
                                onChange={(e) => setChangeIpUrl(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  backgroundColor: '#0e1017',
                                  border: '1px solid #2c3245',
                                  borderRadius: 8,
                                  color: '#ffffff',
                                  fontSize: 12,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={handleSaveCurrentProxyToPool}
                              disabled={!proxyHost.trim()}
                              style={{
                                padding: '8px 14px',
                                backgroundColor: '#1e2433',
                                border: '1px solid #334155',
                                borderRadius: 8,
                                color: '#38bdf8',
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                              title="Save current proxy to reusable pool"
                            >
                              <Bookmark size={13} />
                              Save to Pool
                            </button>
                          </div>
                        </div>

                        {/* Test Status Banner */}
                        {proxyTestResult && (
                          <div
                            style={{
                              fontSize: 12,
                              padding: '10px 14px',
                              borderRadius: 8,
                              backgroundColor: proxyTestResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.15)',
                              border: `1px solid ${proxyTestResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                              color: proxyTestResult.success ? '#34d399' : '#f87171',
                            }}
                          >
                            {proxyTestResult.success ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ fontWeight: 600 }}>
                                  ✓ Connection active · Ping: {proxyTestResult.latencyMs}ms
                                </div>
                                {(proxyTestResult.country || proxyTestResult.city || proxyTestResult.timezone) && (
                                  <div style={{ color: '#cbd5e1', fontSize: 11 }}>
                                    📍 Location: {[proxyTestResult.city, proxyTestResult.country].filter(Boolean).join(', ')}
                                    {proxyTestResult.timezone ? ` · 🕒 Timezone: ${proxyTestResult.timezone}` : ''}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>✗ Connection failed: {proxyTestResult.error}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: PRIVACY & FINGERPRINT & AUTOMATION */}
                {editorTab === 'privacy' && (
                  <>
                    {/* Privacy Level Presets */}
                    <div
                      style={{
                        padding: 18,
                        backgroundColor: '#171a26',
                        border: '1px solid #282d40',
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Shield size={15} color="#10b981" />
                        Anti-Detect & Fingerprint Shields
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {[
                          {
                            id: 'standard',
                            title: 'Standard',
                            desc: 'Minimal spoofing, optimal for standard browsing & high compatibility.',
                            color: '#94a3b8',
                          },
                          {
                            id: 'balanced',
                            title: 'Balanced',
                            desc: 'Recommended. Spoofs Canvas, AudioContext, WebGL noise & font metrics.',
                            color: '#3b82f6',
                          },
                          {
                            id: 'strict',
                            title: 'Strict Defense',
                            desc: 'Maximum stealth. Randomizes hardware concurrency, memory & strict WebGL buffers.',
                            color: '#10b981',
                          },
                        ].map((p) => (
                          <div
                            key={p.id}
                            onClick={() => setPrivacyLevel(p.id as any)}
                            style={{
                              padding: '14px 14px',
                              borderRadius: 10,
                              backgroundColor: privacyLevel === p.id ? '#1e2436' : '#0e1017',
                              border: `1.5px solid ${privacyLevel === p.id ? p.color : '#282d40'}`,
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{p.title}</span>
                              {privacyLevel === p.id && (
                                <CheckCircle2 size={15} color={p.color} />
                              )}
                            </div>
                            <span style={{ fontSize: 11, color: '#82899d', lineHeight: '1.4' }}>
                              {p.desc}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* WebRTC Policy */}
                      <div style={{ marginTop: 4 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ba1b0', marginBottom: 6 }}>
                          WebRTC IP Leakage Shield
                        </label>
                        <select
                          value={webrtcPolicy}
                          onChange={(e: any) => setWebrtcPolicy(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            backgroundColor: '#0e1017',
                            border: '1px solid #2c3245',
                            borderRadius: 8,
                            color: '#ffffff',
                            fontSize: 12,
                          }}
                        >
                          <option value="default_public_interface_only">Prevent LAN & Private IP Leaks (Default Public Interface Only)</option>
                          <option value="disable_non_proxied_udp">Disable Non-Proxied UDP (Maximum Leak Protection)</option>
                          <option value="default">Default Chromium Policy</option>
                        </select>
                      </div>
                    </div>

                    {/* Automation Port & Ephemeral Profile */}
                    <div
                      style={{
                        padding: 18,
                        backgroundColor: '#171a26',
                        border: '1px solid #282d40',
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Settings size={15} color="#a855f7" />
                        Automation & Storage Behavior
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ba1b0', marginBottom: 6 }}>
                          Automation Remote Debugging Port (Puppeteer / Playwright CDP)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input
                            type="number"
                            placeholder="e.g. 9222 (Optional)"
                            value={remoteDebuggingPort}
                            onChange={(e) => setRemoteDebuggingPort(e.target.value ? Number(e.target.value) : '')}
                            min={1024}
                            max={65535}
                            style={{
                              width: 220,
                              padding: '9px 12px',
                              backgroundColor: '#0e1017',
                              border: '1px solid #2c3245',
                              borderRadius: 8,
                              color: '#ffffff',
                              fontSize: 12,
                              boxSizing: 'border-box',
                            }}
                          />
                          <span style={{ fontSize: 12, color: '#82899d' }}>
                            Leave blank unless connecting via automated Puppeteer or Playwright scripts.
                          </span>
                        </div>
                      </div>

                      {/* Ephemeral Profile Toggle */}
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '12px 14px',
                          backgroundColor: '#0e1017',
                          borderRadius: 8,
                          border: '1px solid #282d40',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isTemporary}
                          onChange={(e) => setIsTemporary(e.target.checked)}
                          style={{ width: 16, height: 16, accentColor: '#ef4444', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                            Ephemeral / Temporary Session
                          </div>
                          <div style={{ fontSize: 11, color: '#82899d' }}>
                            All cookies, localStorage, session files, and cache are completely purged when the browser window closes.
                          </div>
                        </div>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Editor Actions Footer Bar */}
            <div
              style={{
                padding: '16px 28px',
                borderTop: '1px solid #232738',
                backgroundColor: '#151824',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: 12, color: '#82899d' }}>
                {editingProfileId ? 'Changes will take effect upon next launch.' : 'New profile will be initialized with a unique partition.'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#202434',
                    border: '1px solid #2f354b',
                    borderRadius: 8,
                    color: '#9ba1b0',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  disabled={!isAuthenticated}
                  type="button"
                  onClick={() => handleSaveProfile(false)}
                  style={{
                    padding: '9px 20px',
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    borderRadius: 8,
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  {editingProfileId ? 'Save Changes' : 'Create Profile'}
                </button>

                <button
                  disabled={!isAuthenticated}
                  type="button"
                  onClick={() => handleSaveProfile(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 20px',
                    backgroundColor: '#10b981',
                    border: 'none',
                    borderRadius: 8,
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  <Play size={13} fill="#fff" />
                  Save & Launch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Import / Export Modal */}
      {cookieModalProfile && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              width: 600,
              maxHeight: '90%',
              backgroundColor: '#161822',
              border: '1px solid #2e3347',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #282c3e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cookie size={18} color="#f59e0b" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Cookie Manager — {cookieModalProfile.name}
                </h3>
              </div>
              <button
                onClick={() => setCookieModalProfile(null)}
                style={{ background: 'none', border: 'none', color: '#9ba1b0', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Format Switcher & Download */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#9ba1b0' }}>Export Format:</span>
                  {(['json', 'netscape'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => handleExportCookiesFormat(fmt)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: cookieModalFormat === fmt ? '#f59e0b' : '#232634',
                        color: cookieModalFormat === fmt ? '#000' : '#9ba1b0',
                      }}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleDownloadCookieFile}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 12px',
                    backgroundColor: '#1e2434',
                    border: '1px solid #333f5c',
                    borderRadius: 6,
                    color: '#38bdf8',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Download size={12} />
                  Download Cookies
                </button>
              </div>

              {/* Stored Cookies Preview */}
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#8b92a2', marginBottom: 4 }}>
                  Stored Cookies ({cookieModalFormat.toUpperCase()})
                </label>
                <textarea
                  readOnly
                  value={cookieModalContent}
                  rows={6}
                  style={{
                    width: '100%',
                    backgroundColor: '#0f1017',
                    border: '1px solid #282c3e',
                    borderRadius: 6,
                    color: '#a3e635',
                    padding: 8,
                    fontSize: 11,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Import Cookies Area */}
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#8b92a2', marginBottom: 4 }}>
                  Import Cookies (Paste JSON array or Netscape lines)
                </label>
                <textarea
                  placeholder="Paste cookies here..."
                  value={cookieImportText}
                  onChange={(e) => setCookieImportText(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    backgroundColor: '#0f1017',
                    border: '1px solid #282c3e',
                    borderRadius: 6,
                    color: '#ffffff',
                    padding: 8,
                    fontSize: 11,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {cookieStatusMsg && (
                <div
                  style={{
                    fontSize: 12,
                    padding: '6px 10px',
                    borderRadius: 6,
                    backgroundColor: cookieStatusMsg.startsWith('✓') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: cookieStatusMsg.startsWith('✓') ? '#34d399' : '#f87171',
                  }}
                >
                  {cookieStatusMsg}
                </div>
              )}
            </div>

            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #282c3e',
                backgroundColor: '#13141c',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <button
                onClick={() => setCookieModalProfile(null)}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#232635',
                  border: '1px solid #33384c',
                  borderRadius: 6,
                  color: '#9ba1b0',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={handleImportCookiesSubmit}
                disabled={!cookieImportText.trim()}
                style={{
                  padding: '6px 16px',
                  backgroundColor: '#10b981',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Import Cookies
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Profile Creator Modal */}
      {showBulkCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#181a24',
              borderRadius: 12,
              width: 540,
              maxWidth: '90vw',
              border: '1px solid #2d3348',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #262a3c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Layers size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                  Bulk Profile Creator
                </h3>
              </div>
              <button
                onClick={() => setShowBulkCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#8b92a2', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    Number of Profiles
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={bulkCount}
                    onChange={(e) => setBulkCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#10121a',
                      border: '1px solid #282d40',
                      borderRadius: 6,
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    Profile Name Prefix
                  </label>
                  <input
                    type="text"
                    value={bulkPrefix}
                    onChange={(e) => setBulkPrefix(e.target.value)}
                    placeholder="Account"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#10121a',
                      border: '1px solid #282d40',
                      borderRadius: 6,
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    Folder / Group
                  </label>
                  <input
                    type="text"
                    value={bulkGroup}
                    onChange={(e) => setBulkGroup(e.target.value)}
                    placeholder="Default"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#10121a',
                      border: '1px solid #282d40',
                      borderRadius: 6,
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    OS Platform
                  </label>
                  <select
                    value={bulkOs}
                    onChange={(e: any) => setBulkOs(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#10121a',
                      border: '1px solid #282d40',
                      borderRadius: 6,
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="mac">macOS</option>
                    <option value="windows">Windows</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    Browser Engine
                  </label>
                  <select
                    value={bulkBrowser}
                    onChange={(e: any) => setBulkBrowser(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#10121a',
                      border: '1px solid #282d40',
                      borderRadius: 6,
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="chrome">Chrome</option>
                    <option value="brave">Brave</option>
                    <option value="edge">Edge</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 4 }}>
                  Proxy List (Optional, one per line):
                </label>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                  Formats: <code>host:port</code> or <code>host:port:user:pass</code> or <code>socks5://user:pass@host:port</code>
                </div>
                <textarea
                  rows={4}
                  value={bulkProxiesText}
                  onChange={(e) => setBulkProxiesText(e.target.value)}
                  placeholder="192.168.1.100:8080&#10;192.168.1.101:8080:username:password"
                  style={{
                    width: '100%',
                    backgroundColor: '#10121a',
                    border: '1px solid #282d40',
                    borderRadius: 6,
                    color: '#ffffff',
                    padding: 8,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #282c3e',
                backgroundColor: '#13141c',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <button
                onClick={() => setShowBulkCreateModal(false)}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#232635',
                  border: '1px solid #33384c',
                  borderRadius: 6,
                  color: '#9ba1b0',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkCreateSubmit}
                disabled={isBulkCreating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 18px',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isBulkCreating ? <Loader2 size={13} className="animate-spin" /> : <Layers size={13} />}
                Generate {bulkCount} Profiles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
