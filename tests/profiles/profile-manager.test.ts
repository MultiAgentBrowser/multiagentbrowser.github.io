import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileManager } from '../../src/profiles/profile-manager';
import { AppPaths } from '../../src/platform/paths';
import fs from 'fs';

import path from 'path';

describe('ProfileManager Lifecycle & Storage Isolation', () => {
  let manager: ProfileManager;

  beforeEach(() => {
    const manifest = path.join(AppPaths.getProfilesDir(), 'profiles.json');
    if (fs.existsSync(manifest)) {
      fs.unlinkSync(manifest);
    }
    manager = new ProfileManager();
  });

  it('initializes with default profiles (Personal, Work, Testing)', () => {
    const profiles = manager.listProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(3);

    const names = profiles.map((p) => p.name);
    expect(names).toContain('Personal');
    expect(names).toContain('Work');
    expect(names).toContain('Testing');
  });

  it('creates an isolated profile with dedicated storage path', () => {
    const profile = manager.createProfile({
      name: 'Crypto & Banking',
      privacyLevel: 'strict',
      webrtcPolicy: 'disable_non_proxied_udp',
    });

    expect(profile.id).toBeDefined();
    expect(profile.name).toBe('Crypto & Banking');
    expect(profile.privacyLevel).toBe('strict');
    expect(profile.webrtcPolicy).toBe('disable_non_proxied_udp');

    // Storage path must exist on disk and be completely separate
    const storagePath = AppPaths.getProfileStorageDir(profile.id);
    expect(fs.existsSync(storagePath)).toBe(true);
    expect(storagePath).toContain(profile.id);
  });

  it('renames and updates profiles', () => {
    const profile = manager.createProfile({ name: 'Old Name' });
    const updated = manager.renameProfile(profile.id, 'New Name');
    expect(updated.name).toBe('New Name');
    expect(manager.getProfile(profile.id)?.name).toBe('New Name');
  });

  it('duplicates a profile preserving privacy settings', () => {
    const original = manager.createProfile({
      name: 'Original Research',
      privacyLevel: 'strict',
      color: '#e11d48',
    });

    const duplicated = manager.duplicateProfile(original.id);
    expect(duplicated.id).not.toBe(original.id);
    expect(duplicated.name).toBe('Original Research (Copy)');
    expect(duplicated.privacyLevel).toBe('strict');
    expect(duplicated.color).toBe('#e11d48');
  });

  it('exports and imports profiles cleanly', () => {
    const profile = manager.createProfile({
      name: 'Shareable Profile',
      privacyLevel: 'balanced',
    });

    const exportedJson = manager.exportProfile(profile.id);
    expect(exportedJson).toContain('Shareable Profile');

    const imported = manager.importProfile(exportedJson);
    expect(imported.id).not.toBe(profile.id);
    expect(imported.name).toBe('Shareable Profile (Imported)');
    expect(imported.privacyLevel).toBe('balanced');
  });

  it('deletes a profile and cleans up its directory', () => {
    const profile = manager.createProfile({ name: 'Disposable' });
    const storagePath = AppPaths.getProfileStorageDir(profile.id);
    expect(fs.existsSync(storagePath)).toBe(true);

    const deleted = manager.deleteProfile(profile.id);
    expect(deleted).toBe(true);
    expect(manager.getProfile(profile.id)).toBeUndefined();
    expect(fs.existsSync(storagePath)).toBe(false);
  });

  it('protects against deleting the last remaining profile', () => {
    const all = manager.listProfiles();
    // Delete all except one
    for (let i = 1; i < all.length; i++) {
      manager.deleteProfile(all[i].id);
    }

    const last = manager.listProfiles();
    expect(last.length).toBe(1);
    expect(() => manager.deleteProfile(last[0].id)).toThrow(
      'Cannot delete the last remaining profile'
    );
  });
});

