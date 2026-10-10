import { describe, expect, it, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createProxyAuthExtension } from '../../src/browser/proxy-extension';

describe('Proxy Auth Extension Generator', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    tempDir = undefined;
  });

  it('generates unpacked extension with correct manifest and credentials', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proxy-auth-test-'));
    const extDir = createProxyAuthExtension(tempDir, 'user_alpha', 'pass_secret_123');

    const manifestPath = path.join(extDir, 'manifest.json');
    const backgroundPath = path.join(extDir, 'background.js');

    expect(fs.existsSync(manifestPath)).toBe(true);
    expect(fs.existsSync(backgroundPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBe('Proxy Authentication Provider');
    expect(manifest.permissions).toContain('webRequest');
    expect(manifest.permissions).toContain('webRequestBlocking');

    const script = fs.readFileSync(backgroundPath, 'utf-8');
    expect(script).toContain('"user_alpha"');
    expect(script).toContain('"pass_secret_123"');
    expect(script).toContain('chrome.webRequest.onAuthRequired.addListener');
  });
});

