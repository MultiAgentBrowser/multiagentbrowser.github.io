import { describe, it, expect } from 'vitest';
import { NavigationController } from '../../src/browser/navigation-controller';
import { IPCValidator } from '../../src/security/ipc-validator';
import { AppPaths } from '../../src/platform/paths';
import {
  ProxyConfigSchema,
  ProfileSchema,
  PrivacyLevelSchema,
  WebRTCPolicySchema,
} from '../../src/security/ipc-contracts';

describe('Security Boundaries & RCE Prevention Integration Tests', () => {
  it('blocks all executable or dangerous protocol schemes in NavigationController', () => {
    const dangerousSchemes = [
      'javascript:alert(document.cookie)',
      'javascript:fetch("https://evil.com")',
      'vbscript:MsgBox(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/shadow',
      'file:///C:/Windows/System32/cmd.exe',
      'chrome://flags',
    ];

    for (const dangerous of dangerousSchemes) {
      const sanitized = NavigationController.sanitizeUrl(dangerous);
      expect(sanitized).toBe('about:blank');
    }
  });

  it('rejects directory traversal payloads in profile path resolution', () => {
    const maliciousPaths = [
      '../../../Windows/System32',
      '../../../../etc/passwd',
      '..\\..\\..\\sensitive',
      'profile-test/../../evil',
    ];

    for (const badPath of maliciousPaths) {
      const resolved = AppPaths.getProfileStorageDir(badPath);
      // Traversal characters must be sanitized and never escape the profiles root directory
      expect(resolved.startsWith(AppPaths.getProfilesDir())).toBe(true);
      expect(resolved).not.toContain('..');
      expect(resolved).not.toContain('etc/passwd');
    }
  });

  it('validates IPC schemas and rejects out-of-bounds parameters', () => {
    // Port out of range
    expect(() =>
      IPCValidator.validate(ProxyConfigSchema, {
        enabled: true,
        mode: 'socks5',
        host: '127.0.0.1',
        port: 70000,
      })
    ).toThrow();

    // Port negative
    expect(() =>
      IPCValidator.validate(ProxyConfigSchema, {
        enabled: true,
        mode: 'socks5',
        host: '127.0.0.1',
        port: -1,
      })
    ).toThrow();

    // Invalid mode
    expect(() =>
      IPCValidator.validate(ProxyConfigSchema, {
        enabled: true,
        mode: 'malicious_protocol',
        host: '127.0.0.1',
        port: 8080,
      })
    ).toThrow();

    // Invalid privacy level
    expect(() => IPCValidator.validate(PrivacyLevelSchema, 'stealth_hacker_mode')).toThrow();

    // Invalid WebRTC policy
    expect(() => IPCValidator.validate(WebRTCPolicySchema, 'leak_all_ips')).toThrow();
  });
});
