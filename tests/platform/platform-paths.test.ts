import { describe, it, expect } from 'vitest';
import { AppPaths } from '../../src/platform/paths';
import { getPlatformInfo } from '../../src/platform/platform-info';

describe('Platform & Path Infrastructure', () => {
  it('correctly detects current runtime platform', () => {
    const info = getPlatformInfo();
    expect(info).toBeDefined();
    expect(typeof info.isMac).toBe('boolean');
    expect(typeof info.isWindows).toBe('boolean');
    expect(typeof info.arch).toBe('string');
  });

  it('resolves app data directory without errors', () => {
    const appData = AppPaths.getAppDataDir();
    expect(appData).toBeDefined();
    expect(typeof appData).toBe('string');
    expect(appData.length).toBeGreaterThan(0);
  });

  it('resolves profiles root directory', () => {
    const profilesDir = AppPaths.getProfilesDir();
    expect(profilesDir).toContain('Profiles');
  });

  it('prevents path traversal when resolving specific profile storage directories', () => {
    // Normal ID
    const safeDir = AppPaths.getProfileStorageDir('profile_123');
    expect(safeDir).toContain('profile_123');

    // Attempted directory traversal characters should be stripped
    const traversalDir = AppPaths.getProfileStorageDir('../../../etc/passwd');
    expect(traversalDir).not.toContain('..');
    expect(traversalDir).toContain('etcpasswd');
  });
});

