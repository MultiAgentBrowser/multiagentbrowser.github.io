import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionManager } from '../../src/permissions/permission-manager';

describe('Centralized Permission Manager & Isolation', () => {
  const profileA = 'perm-profile-alpha';
  const profileB = 'perm-profile-beta';

  beforeEach(() => {
    PermissionManager.resetPermissions(profileA);
    PermissionManager.resetPermissions(profileB);
  });

  it('defaults unconfigured permissions to ask', () => {
    const decision = PermissionManager.getPermission(profileA, 'https://example.com', 'media');
    expect(decision).toBe('ask');
  });

  it('stores and retrieves allow and block decisions per origin', () => {
    PermissionManager.setPermission(profileA, 'https://app.zoom.us', 'media', 'allow');
    PermissionManager.setPermission(profileA, 'https://shady-ads.com', 'geolocation', 'block');

    expect(PermissionManager.getPermission(profileA, 'https://app.zoom.us', 'media')).toBe('allow');
    expect(PermissionManager.getPermission(profileA, 'https://shady-ads.com', 'geolocation')).toBe('block');
  });

  it('strictly isolates permissions between distinct profiles', () => {
    // Grant media in Profile A
    PermissionManager.setPermission(profileA, 'https://video-call.org', 'media', 'allow');

    // Must still default to 'ask' in Profile B
    expect(PermissionManager.getPermission(profileB, 'https://video-call.org', 'media')).toBe('ask');

    // Explicitly block in Profile B
    PermissionManager.setPermission(profileB, 'https://video-call.org', 'media', 'block');

    // Profile A must remain 'allow'
    expect(PermissionManager.getPermission(profileA, 'https://video-call.org', 'media')).toBe('allow');
    expect(PermissionManager.getPermission(profileB, 'https://video-call.org', 'media')).toBe('block');
  });

  it('lists and resets stored permissions', () => {
    PermissionManager.setPermission(profileA, 'https://maps.google.com', 'geolocation', 'allow');
    PermissionManager.setPermission(profileA, 'https://chat.com', 'notifications', 'allow');

    const list = PermissionManager.listPermissions(profileA);
    expect(list.length).toBe(2);

    PermissionManager.resetPermissions(profileA);
    expect(PermissionManager.listPermissions(profileA).length).toBe(0);
  });
});

