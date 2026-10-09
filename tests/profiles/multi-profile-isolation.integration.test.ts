import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileManager } from '../../src/profiles/profile-manager';
import { PermissionManager } from '../../src/permissions/permission-manager';
import { PrivacyEngine } from '../../src/privacy/privacy-engine';
import { ProxyManager } from '../../src/network/proxy/proxy-manager';
import { AppPaths } from '../../src/platform/paths';
import fs from 'fs';
import path from 'path';

describe('Multi-Profile Simultaneous Isolation Integration Tests', () => {
  let profileManager: ProfileManager;

  beforeEach(() => {
    const manifest = path.join(AppPaths.getProfilesDir(), 'profiles.json');
    if (fs.existsSync(manifest)) {
      fs.unlinkSync(manifest);
    }
    profileManager = new ProfileManager();
  });

  it('guarantees complete isolation of storage paths across concurrent profiles', () => {
    const personal = profileManager.createProfile({ name: 'Personal Profile', privacyLevel: 'standard' });
    const work = profileManager.createProfile({ name: 'Work Profile', privacyLevel: 'balanced' });
    const banking = profileManager.createProfile({ name: 'Banking Profile', privacyLevel: 'strict' });

    const personalDir = AppPaths.getProfileStorageDir(personal.id);
    const workDir = AppPaths.getProfileStorageDir(work.id);
    const bankingDir = AppPaths.getProfileStorageDir(banking.id);

    // Directories must exist and be completely distinct
    expect(fs.existsSync(personalDir)).toBe(true);
    expect(fs.existsSync(workDir)).toBe(true);
    expect(fs.existsSync(bankingDir)).toBe(true);

    expect(personalDir).not.toBe(workDir);
    expect(workDir).not.toBe(bankingDir);
    expect(personalDir).not.toBe(bankingDir);
  });

  it('maintains strict permission divergence between concurrent profiles for the same origin', () => {
    const p1 = profileManager.createProfile({ name: 'Profile One' });
    const p2 = profileManager.createProfile({ name: 'Profile Two' });
    const p3 = profileManager.createProfile({ name: 'Profile Three' });

    const targetOrigin = 'https://app.slack.com';

    // Set contradictory permissions on the identical origin across profiles
    PermissionManager.setPermission(p1.id, targetOrigin, 'media', 'allow');
    PermissionManager.setPermission(p2.id, targetOrigin, 'media', 'block');
    // p3 left unconfigured (defaults to 'ask')

    expect(PermissionManager.getPermission(p1.id, targetOrigin, 'media')).toBe('allow');
    expect(PermissionManager.getPermission(p2.id, targetOrigin, 'media')).toBe('block');
    expect(PermissionManager.getPermission(p3.id, targetOrigin, 'media')).toBe('ask');
  });

  it('maintains distinct proxy configurations per profile simultaneously', () => {
    const pDirect = profileManager.createProfile({
      name: 'Direct Browser',
      proxy: { enabled: false, mode: 'direct', host: '', port: 8080 },
    });

    const pTorSocks = profileManager.createProfile({
      name: 'Tor SOCKS5 Profile',
      proxy: { enabled: true, mode: 'socks5', host: '127.0.0.1', port: 9050 },
    });

    const pCorporateHttp = profileManager.createProfile({
      name: 'Corporate Proxy',
      proxy: { enabled: true, mode: 'http', host: 'corp.internal', port: 3128 },
    });

    expect(ProxyManager.buildProxyRules(pDirect.proxy)).toBe('direct://');
    expect(ProxyManager.buildProxyRules(pTorSocks.proxy)).toBe('socks5://127.0.0.1:9050');
    expect(ProxyManager.buildProxyRules(pCorporateHttp.proxy)).toBe('http://corp.internal:3128');
  });

  it('isolates real-time privacy telemetry per profile partition', () => {
    const userA = profileManager.createProfile({ name: 'User A', privacyLevel: 'balanced' });
    const userB = profileManager.createProfile({ name: 'User B', privacyLevel: 'balanced' });

    PrivacyEngine.configureProfile(userA.id, 'balanced');
    PrivacyEngine.configureProfile(userB.id, 'balanced');

    // Record blockers on User A only
    PrivacyEngine.recordTrackerBlocked(userA.id);
    PrivacyEngine.recordTrackerBlocked(userA.id);
    PrivacyEngine.recordCookieBlocked(userA.id);

    const statsA = PrivacyEngine.getPrivacyStats(userA.id);
    const statsB = PrivacyEngine.getPrivacyStats(userB.id);

    expect(statsA.trackersBlocked).toBe(2);
    expect(statsA.cookiesBlocked).toBe(1);

    expect(statsB.trackersBlocked).toBe(0);
    expect(statsB.cookiesBlocked).toBe(0);
  });

  it('wipes ephemeral/temporary profiles without affecting persistent profiles', () => {
    const persistent = profileManager.createProfile({ name: 'Keep Me', isTemporary: false });
    const ephemeral = profileManager.createProfile({ name: 'Temporary Session', isTemporary: true });

    const persistentDir = AppPaths.getProfileStorageDir(persistent.id);
    const ephemeralDir = AppPaths.getProfileStorageDir(ephemeral.id);

    expect(fs.existsSync(persistentDir)).toBe(true);
    expect(fs.existsSync(ephemeralDir)).toBe(true);

    // Delete ephemeral profile
    profileManager.deleteProfile(ephemeral.id);

    // Ephemeral directory must be destroyed
    expect(fs.existsSync(ephemeralDir)).toBe(false);
    // Persistent directory must remain untouched
    expect(fs.existsSync(persistentDir)).toBe(true);
  });
});

