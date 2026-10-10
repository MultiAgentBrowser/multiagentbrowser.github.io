import { describe, expect, it } from 'vitest';
import { serializeCloudProfile } from '../../src/ui/services/cloud-profile-sync';
import { Profile } from '../../src/security/ipc-contracts';

describe('Cloud profile serialization', () => {
  it('removes local paths, runtime state, and proxy credentials before upload', () => {
    const profile: Profile = {
      id: 'work',
      name: 'Work',
      isTemporary: false,
      privacyLevel: 'balanced',
      webrtcPolicy: 'default_public_interface_only',
      proxy: {
        enabled: true,
        mode: 'http',
        host: 'proxy.example.com',
        port: 8080,
        username: 'secret-user',
        password: 'secret-password',
      },
      os: 'mac',
      browserType: 'chrome',
      browserVersion: '154.0.8037.98',
      group: 'Work',
      storagePath: '/private/profile/path',
      status: 'running',
      lastUsedAt: 123,
      notes: '',
      tags: [],
      color: '#3b82f6',
      createdAt: 100,
      updatedAt: 200,
    };

    const cloudData = serializeCloudProfile(profile);

    expect(cloudData).not.toHaveProperty('storagePath');
    expect(cloudData).not.toHaveProperty('status');
    expect(cloudData).not.toHaveProperty('lastUsedAt');
    expect(cloudData).toMatchObject({
      isTemporary: false,
      group: 'Work',
      proxy: { enabled: true, host: 'proxy.example.com', port: 8080 },
    });
    expect(cloudData.proxy).not.toHaveProperty('username');
    expect(cloudData.proxy).not.toHaveProperty('password');
  });
});
