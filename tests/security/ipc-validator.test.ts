import { describe, it, expect } from 'vitest';
import { IPCValidator } from '../../src/security/ipc-validator';
import {
  ProfileSchema,
  ProxyConfigSchema,
  PrivacyLevelSchema,
  WebRTCPolicySchema,
} from '../../src/security/ipc-contracts';

describe('IPC Validation & Security Boundary', () => {
  it('validates privacy levels strictly', () => {
    expect(IPCValidator.validate(PrivacyLevelSchema, 'standard')).toBe('standard');
    expect(IPCValidator.validate(PrivacyLevelSchema, 'balanced')).toBe('balanced');
    expect(IPCValidator.validate(PrivacyLevelSchema, 'strict')).toBe('strict');

    expect(() => IPCValidator.validate(PrivacyLevelSchema, 'invalid_mode')).toThrow(
      '[Security Error] Invalid IPC Payload'
    );
  });

  it('validates WebRTC policies strictly', () => {
    expect(
      IPCValidator.validate(WebRTCPolicySchema, 'default_public_interface_only')
    ).toBe('default_public_interface_only');

    expect(() => IPCValidator.validate(WebRTCPolicySchema, 'hack_ip')).toThrow();
  });

  it('validates and sanitizes ProxyConfig', () => {
    const validProxy = {
      enabled: true,
      mode: 'socks5',
      host: '127.0.0.1',
      port: 9050,
    };
    const parsed = IPCValidator.validate(ProxyConfigSchema, validProxy);
    expect(parsed.port).toBe(9050);
    expect(parsed.mode).toBe('socks5');

    // Invalid port (out of range)
    expect(() =>
      IPCValidator.validate(ProxyConfigSchema, {
        enabled: true,
        mode: 'socks5',
        host: '127.0.0.1',
        port: 999999,
      })
    ).toThrow();
  });

  it('validates complete profile schemas and rejects malformed inputs', () => {
    const profile = {
      id: 'work-profile',
      name: 'Work Profile',
      isTemporary: false,
      privacyLevel: 'strict',
      webrtcPolicy: 'disable_non_proxied_udp',
      proxy: {
        enabled: false,
        mode: 'direct',
        host: '',
        port: 8080,
      },
      createdAt: 1700000000,
      updatedAt: 1700000000,
    };

    const validated = IPCValidator.validate(ProfileSchema, profile);
    expect(validated.id).toBe('work-profile');

    // Empty profile name should fail
    expect(() =>
      IPCValidator.validate(ProfileSchema, {
        ...profile,
        name: '',
      })
    ).toThrow();
  });
});

