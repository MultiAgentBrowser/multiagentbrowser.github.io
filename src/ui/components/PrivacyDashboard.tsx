import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Globe,
  Radio,
  Cookie,
  Fingerprint,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { PrivacyStats, TabInfo, Profile } from '../../security/ipc-contracts';

interface PrivacyDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PrivacyStats;
  activeTab?: TabInfo;
  activeProfile?: Profile;
  onClearSiteData?: () => void;
}

export const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({
  isOpen,
  onClose,
  stats,
  activeTab,
  activeProfile,
  onClearSiteData,
}) => {
  const [siteProtectionEnabled, setSiteProtectionEnabled] = useState(true);

  if (!isOpen) return null;

  const score = stats.privacyScore;
  const scoreColor = score >= 85 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171';

  return (
    <div
      style={{
        position: 'fixed',
        top: 86,
        right: 180,
        width: 380,
        backgroundColor: '#1a1c23',
        border: '1px solid #2f3444',
        borderRadius: 12,
        boxShadow: '0 16px 36px rgba(0,0,0,0.65)',
        zIndex: 1000,
        overflow: 'hidden',
        color: '#e2e4e9',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 18px',
          borderBottom: '1px solid #282a36',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, #1f222d 0%, #1a1c23 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={20} color={scoreColor} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#ffffff' }}>Privacy Shield</div>
            <div style={{ fontSize: 11, color: '#9ba1b0' }}>
              Profile: <strong>{activeProfile?.name || 'Default'}</strong>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#9ba1b0', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Score Banner */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #262936' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#9ba1b0', fontWeight: 500 }}>
            Overall Privacy Score
          </span>
          <span style={{ fontSize: 24, fontWeight: 700, color: scoreColor }}>
            {score}<span style={{ fontSize: 14, color: '#8b92a2', fontWeight: 400 }}>/100</span>
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 6,
            width: '100%',
            backgroundColor: '#121316',
            borderRadius: 3,
            overflow: 'hidden',
            marginTop: 8,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${score}%`,
              backgroundColor: scoreColor,
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Metrics Checklist */}
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Trackers */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={16} color="#34d399" />
            <span>Trackers Blocked</span>
          </div>
          <strong style={{ color: '#ffffff' }}>{stats.trackersBlocked}</strong>
        </div>

        {/* Third-Party Cookies */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cookie size={16} color="#34d399" />
            <span>Third-Party Cookies Blocked</span>
          </div>
          <strong style={{ color: '#ffffff' }}>{stats.cookiesBlocked}</strong>
        </div>

        {/* Fingerprinting Attempts */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Fingerprint size={16} color="#34d399" />
            <span>Fingerprinting Defenses</span>
          </div>
          <span style={{ color: '#34d399', fontSize: 12, fontWeight: 500 }}>
            {activeProfile?.privacyLevel.toUpperCase()}
          </span>
        </div>

        {/* WebRTC */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Radio size={16} color={stats.webrtcProtected ? '#34d399' : '#f87171'} />
            <span>WebRTC IP Leak Guard</span>
          </div>
          <span style={{ color: stats.webrtcProtected ? '#34d399' : '#f87171', fontSize: 12 }}>
            {stats.webrtcProtected ? 'Active' : 'Exposed'}
          </span>
        </div>

        {/* Transport Security */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock size={16} color={stats.httpsSecure ? '#34d399' : '#fbbf24'} />
            <span>HTTPS Encryption</span>
          </div>
          <span style={{ color: stats.httpsSecure ? '#34d399' : '#fbbf24', fontSize: 12 }}>
            {stats.httpsSecure ? 'Encrypted' : 'HTTP Only'}
          </span>
        </div>

        {/* Proxy Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Globe size={16} color={stats.proxyConnected ? '#34d399' : '#9ba1b0'} />
            <span>Proxy Status</span>
          </div>
          <span style={{ color: stats.proxyConnected ? '#34d399' : '#9ba1b0', fontSize: 12 }}>
            {stats.proxyConnected ? 'Connected' : 'Direct'}
          </span>
        </div>
      </div>

      {/* Per-site toggle & Quick Actions */}
      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid #262936',
          backgroundColor: '#15161c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={siteProtectionEnabled}
            onChange={(e) => setSiteProtectionEnabled(e.target.checked)}
          />
          Protection on this site
        </label>

        {onClearSiteData && (
          <button
            onClick={onClearSiteData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              color: '#f87171',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={13} />
            Clear Site Data
          </button>
        )}
      </div>
    </div>
  );
};

