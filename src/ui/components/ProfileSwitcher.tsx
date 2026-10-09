import React, { useState } from 'react';
import {
  User,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Check,
  X,
  Shield,
  Zap,
} from 'lucide-react';
import { Profile } from '../../security/ipc-contracts';

interface ProfileSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onRefreshProfiles: () => void;
}

export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  onSelectProfile,
  onRefreshProfiles,
}) => {
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePrivacy, setNewProfilePrivacy] = useState<'standard' | 'balanced' | 'strict'>('balanced');
  const [isTemporary, setIsTemporary] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [showImport, setShowImport] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim() || !window.browserAPI) return;

    await window.browserAPI.createProfile({
      name: newProfileName.trim(),
      privacyLevel: newProfilePrivacy,
      isTemporary,
      color: isTemporary ? '#ef4444' : '#3b82f6',
    });

    setNewProfileName('');
    setIsTemporary(false);
    onRefreshProfiles();
  };

  const handleDelete = async (profileId: string) => {
    if (profiles.length <= 1) {
      alert('Cannot delete the only remaining profile.');
      return;
    }
    if (confirm('Delete this profile and wipe all its stored data?')) {
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
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 520,
          backgroundColor: '#1a1c23',
          border: '1px solid #2f3444',
          borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #282a36',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <User size={20} color="#3b82f6" />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#ffffff' }}>
              Browser Profiles
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ba1b0',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile List */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#8b92a2', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Existing Profiles
          </div>

          {profiles.map((p) => {
            const isActive = p.id === activeProfileId;
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: isActive ? '#242838' : '#14151b',
                  border: `1px solid ${isActive ? '#3b82f6' : '#282b37'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => onSelectProfile(p.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: p.color || '#3b82f6',
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#ffffff' }}>
                        {p.name}
                      </span>
                      {isActive && (
                        <span
                          style={{
                            fontSize: 10,
                            backgroundColor: '#3b82f6',
                            color: '#fff',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}
                        >
                          ACTIVE
                        </span>
                      )}
                      {p.isTemporary && (
                        <span
                          style={{
                            fontSize: 10,
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}
                        >
                          TEMPORARY
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#8b92a2', marginTop: 2 }}>
                      Privacy: {p.privacyLevel.toUpperCase()} • WebRTC: {p.webrtcPolicy}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDuplicate(p.id)}
                    style={{ background: 'none', border: 'none', color: '#9ba1b0', cursor: 'pointer', padding: 4 }}
                    title="Duplicate Profile"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    onClick={() => handleExport(p.id)}
                    style={{ background: 'none', border: 'none', color: '#9ba1b0', cursor: 'pointer', padding: 4 }}
                    title="Export Profile"
                  >
                    <Download size={15} />
                  </button>
                  {profiles.length > 1 && (
                    <button
                      onClick={() => handleDelete(p.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                      title="Delete Profile"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Profile Section */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #282a36', backgroundColor: '#16171e' }}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="New profile name (e.g. Work, Research)..."
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#121316',
                  border: '1px solid #2f3444',
                  borderRadius: 6,
                  color: '#ffffff',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <select
                value={newProfilePrivacy}
                onChange={(e: any) => setNewProfilePrivacy(e.target.value)}
                style={{
                  padding: '8px 10px',
                  backgroundColor: '#121316',
                  border: '1px solid #2f3444',
                  borderRadius: 6,
                  color: '#ffffff',
                  fontSize: 12,
                }}
              >
                <option value="standard">Standard</option>
                <option value="balanced">Balanced</option>
                <option value="strict">Strict</option>
              </select>
              <button
                type="submit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: 6,
                  color: '#ffffff',
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <Plus size={15} />
                Create
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9ba1b0', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isTemporary}
                  onChange={(e) => setIsTemporary(e.target.checked)}
                />
                Temporary Profile (auto-wiped upon closure)
              </label>

              <button
                type="button"
                onClick={() => setShowImport(!showImport)}
                style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
              >
                {showImport ? 'Cancel Import' : 'Import Profile JSON'}
              </button>
            </div>

            {showImport && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <textarea
                  placeholder="Paste exported profile JSON here..."
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    backgroundColor: '#121316',
                    border: '1px solid #2f3444',
                    borderRadius: 6,
                    color: '#ffffff',
                    padding: 8,
                    fontSize: 11,
                    fontFamily: 'monospace',
                  }}
                />
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  style={{
                    alignSelf: 'flex-end',
                    padding: '6px 12px',
                    backgroundColor: '#10b981',
                    border: 'none',
                    borderRadius: 4,
                    color: '#ffffff',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Import
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

