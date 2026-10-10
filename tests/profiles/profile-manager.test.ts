import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileManager } from '../../src/profiles/profile-manager';
import { ProfileDatabase } from '../../src/database/profile-database';
import { ProfileLock } from '../../src/profiles/profile-lock';
import { ProfileRecordSchema } from '../../src/profiles/profile-model';
import { ProfileStorage } from '../../src/profiles/profile-storage';
import { AppPaths } from '../../src/platform/paths';
import fs from 'fs';
import path from 'path';

describe('ProfileManager Lifecycle & Storage Isolation', () => {
  let manager: ProfileManager;

  beforeEach(() => {
    ProfileDatabase.getInstance().clear();
    const manifest = path.join(AppPaths.getProfilesDir(), 'profiles.json');
    if (fs.existsSync(manifest)) {
      fs.unlinkSync(manifest);
    }
    manager = new ProfileManager();
  });

  it('starts with no demo profiles and does not select a default browser profile', () => {
    const profiles = manager.listProfiles();
    expect(profiles).toEqual([]);
    expect(() => manager.getActiveProfile()).toThrow('No profiles are available. Sign in and create a profile first.');
  });

  it('removes persisted demo profile records and their directories', () => {
    const demo = ProfileRecordSchema.parse({
      id: 'default',
      name: 'Personal',
      storagePath: AppPaths.getProfileStorageDir('default'),
      isTemporary: false,
      privacyLevel: 'balanced',
      webrtcPolicy: 'default_public_interface_only',
      proxy: { enabled: false, mode: 'direct', host: '', port: 8080 },
      os: 'mac',
      browserType: 'chrome',
      browserVersion: '131.0.6778.86',
      status: 'stopped',
      lastUsedAt: null,
      notes: '',
      tags: [],
      color: '#3b82f6',
      createdAt: 1,
      updatedAt: 1,
    });
    ProfileStorage.ensureProfileDirectory(demo.id);
    ProfileStorage.saveProfilesManifest([demo]);

    manager = new ProfileManager();

    expect(manager.listProfiles()).toEqual([]);
    expect(ProfileDatabase.getInstance().getProfile(demo.id)).toBeNull();
    expect(fs.existsSync(demo.storagePath)).toBe(false);
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

  it('replaces profiles from this account without overwriting matching local proxy credentials', () => {
    const local = manager.createProfile({
      name: 'Cloud profile',
      proxy: {
        enabled: true,
        mode: 'http',
        host: 'old.proxy.test',
        port: 8080,
        username: 'local-user',
        password: 'local-secret',
      },
    });
    const remote = {
      ...local,
      name: 'Cloud profile updated',
      updatedAt: local.updatedAt + 1,
      proxy: {
        enabled: true,
        mode: 'http' as const,
        host: 'new.proxy.test',
        port: 9090,
      },
    };

    const replaced = manager.replaceSyncedProfiles([remote]);
    const profile = replaced.find((item) => item.id === local.id);

    expect(profile?.name).toBe('Cloud profile updated');
    expect(profile?.proxy.host).toBe('new.proxy.test');
    expect(profile?.proxy.username).toBe('local-user');
    expect(profile?.proxy.password).toBe('local-secret');
  });

  it('clears profiles from a previous local account when the signed-in account is empty', () => {
    const local = manager.createProfile({ name: 'Previous account profile' });

    expect(manager.replaceSyncedProfiles([])).toEqual([]);
    expect(manager.listProfiles()).toEqual([]);
    expect(ProfileDatabase.getInstance().getProfile(local.id)).toBeNull();
    expect(fs.existsSync(AppPaths.getProfileStorageDir(local.id))).toBe(true);
  });

  it('does not treat local running status changes as profile-setting edits', () => {
    const profile = manager.createProfile({ name: 'Status test' });
    const updatedAt = profile.updatedAt;

    manager.updateProfileStatus(profile.id, 'running');

    expect(manager.getProfile(profile.id)?.updatedAt).toBe(updatedAt);
  });

  it('rejects cloud profiles with unsafe IDs', () => {
    const profile = manager.listProfiles()[0];
    expect(() => manager.replaceSyncedProfiles([{ ...profile, id: '../outside' }]))
      .toThrow('Cloud profile data is invalid.');
  });

  it('duplicates a profile preserving privacy settings', () => {
    const original = manager.createProfile({
      name: 'Original Research',
      privacyLevel: 'strict',
      os: 'windows',
      browserType: 'edge',
      browserVersion: '131.0.2903.86',
      color: '#e11d48',
    });

    const duplicated = manager.duplicateProfile(original.id);
    expect(duplicated.id).not.toBe(original.id);
    expect(duplicated.name).toBe('Original Research (Copy)');
    expect(duplicated.privacyLevel).toBe('strict');
    expect(duplicated.os).toBe('windows');
    expect(duplicated.browserType).toBe('edge');
    expect(duplicated.browserVersion).toBe('131.0.2903.86');
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

  it('allows deleting the last profile and returns to an empty state', () => {
    const profile = manager.createProfile({ name: 'Last profile' });

    expect(manager.deleteProfile(profile.id)).toBe(true);
    expect(manager.listProfiles()).toEqual([]);
    expect(() => manager.getActiveProfile()).toThrow(
      'No profiles are available. Sign in and create a profile first.'
    );
  });

  it('preserves a temporary profile while its separate browser process holds the lock', () => {
    const temporary = manager.createProfile({ name: 'Running Temporary', isTemporary: true });
    expect(ProfileLock.acquire(temporary.id)).toBe(true);

    const reloadedManager = new ProfileManager();
    expect(reloadedManager.getProfile(temporary.id)).toBeDefined();

    ProfileLock.release(temporary.id);
    reloadedManager.deleteProfile(temporary.id);
  });

  afterEach(() => {
    ProfileDatabase.getInstance().clear();
    const manifest = path.join(AppPaths.getProfilesDir(), 'profiles.json');
    if (fs.existsSync(manifest)) {
      fs.unlinkSync(manifest);
    }
  });
});
