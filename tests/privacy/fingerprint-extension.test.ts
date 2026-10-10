import { afterEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createFingerprintProtectionExtension } from '../../src/privacy/fingerprint/fingerprint-extension';
import { getProfileFingerprintSeed } from '../../src/privacy/fingerprint/profile-fingerprint';

describe('Profile fingerprint extension', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  });

  it('generates a document-start main-world shield with stable per-profile values', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fingerprint-extension-test-'));
    const extensionPath = createFingerprintProtectionExtension(
      tempDir,
      'profile-a',
      'mac',
      'balanced'
    );

    const manifest = JSON.parse(fs.readFileSync(path.join(extensionPath, 'manifest.json'), 'utf-8'));
    const script = fs.readFileSync(path.join(extensionPath, 'fingerprint.js'), 'utf-8');
    const rules = JSON.parse(fs.readFileSync(path.join(extensionPath, 'rules.json'), 'utf-8'));
    const background = fs.readFileSync(path.join(extensionPath, 'background.js'), 'utf-8');

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toContain('declarativeNetRequest');
    expect(manifest.permissions).toContain('privacy');
    expect(manifest.declarative_net_request.rule_resources[0].path).toBe('rules.json');
    expect(manifest.content_scripts[0]).toMatchObject({
      run_at: 'document_start',
      all_frames: true,
      match_about_blank: true,
      world: 'MAIN',
    });
    expect(script).toContain('CanvasRenderingContext2D');
    expect(script).toContain(JSON.stringify(getProfileFingerprintSeed('profile-a')));
    expect(script).not.toContain(JSON.stringify(getProfileFingerprintSeed('profile-b')));
    expect(rules).toContainEqual(expect.objectContaining({
      action: { type: 'block' },
      condition: expect.objectContaining({ urlFilter: '||fpnpmcdn.net^' }),
    }));
    expect(rules[0].condition.excludedResourceTypes).toContain('main_frame');
    expect(background).toContain('thirdPartyCookiesAllowed.set');
    expect(background).toContain('value: false');
  });
});
