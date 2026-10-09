import React, { useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  ShieldCheck,
  Lock,
  Globe,
  Settings,
  User,
  Terminal,
} from 'lucide-react';
import { TabInfo, Profile, PrivacyStats } from '../../security/ipc-contracts';

interface NavigationBarProps {
  activeTab?: TabInfo;
  activeProfile?: Profile;
  stats?: PrivacyStats;
  urlInput: string;
  setUrlInput: (val: string) => void;
  onNavigate: (e: React.FormEvent) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onToggleDevTools: () => void;
  onOpenProfiles: () => void;
  onOpenPrivacyDashboard: () => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  activeTab,
  activeProfile,
  stats,
  urlInput,
  setUrlInput,
  onNavigate,
  onGoBack,
  onGoForward,
  onReload,
  onToggleDevTools,
  onOpenProfiles,
  onOpenPrivacyDashboard,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isSecure = urlInput.startsWith('https://');

  const handleFocus = () => {
    inputRef.current?.select();
  };

  return (
    <div className="nav-bar">
      <button
        className="nav-btn"
        disabled={!activeTab?.canGoBack}
        onClick={onGoBack}
        title="Back (Cmd/Ctrl + [)"
      >
        <ArrowLeft size={16} />
      </button>

      <button
        className="nav-btn"
        disabled={!activeTab?.canGoForward}
        onClick={onGoForward}
        title="Forward (Cmd/Ctrl + ])"
      >
        <ArrowRight size={16} />
      </button>

      <button className="nav-btn" onClick={onReload} title="Reload (Cmd/Ctrl + R)">
        <RotateCw size={15} />
      </button>

      <form onSubmit={onNavigate} className="url-input-container">
        {isSecure ? (
          <Lock size={14} color="#34d399" title="Connection is encrypted (HTTPS)" />
        ) : (
          <Globe size={14} color="#9ba1b0" />
        )}
        <input
          ref={inputRef}
          type="text"
          className="url-input"
          value={urlInput}
          onFocus={handleFocus}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Search DuckDuckGo or enter URL securely..."
          spellCheck={false}
          autoComplete="off"
        />
      </form>

      <button
        className="nav-btn"
        title={`Privacy Shield: ${stats?.privacyScore ?? 92}/100`}
        onClick={onOpenPrivacyDashboard}
        style={{ color: '#34d399', background: 'rgba(52, 211, 153, 0.1)' }}
      >
        <ShieldCheck size={18} />
      </button>

      <button
        className="nav-btn"
        title="Toggle Developer Tools"
        onClick={onToggleDevTools}
      >
        <Terminal size={17} />
      </button>

      <button
        className="nav-btn"
        title="Open Incognition Profile Hub"
        onClick={onOpenProfiles}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: 'auto',
          padding: '0 10px',
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          borderRadius: 6,
        }}
      >
        <User size={14} color="#3b82f6" />
        <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600 }}>
          {activeProfile?.name || 'Profiles Hub'}
        </span>
        <span style={{ fontSize: 10, backgroundColor: '#1e293b', color: '#93c5fd', padding: '1px 5px', borderRadius: 3 }}>
          {((activeProfile as any)?.browserType || 'Chrome').toUpperCase()}
        </span>
      </button>

      <button className="nav-btn" title="Browser Settings">
        <Settings size={18} />
      </button>
    </div>
  );
};
