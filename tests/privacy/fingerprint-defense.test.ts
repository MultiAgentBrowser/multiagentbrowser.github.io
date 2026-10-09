import { describe, it, expect } from 'vitest';
import { FingerprintConfig } from '../../src/privacy/fingerprint/fingerprint-config';
import { FingerprintInjector } from '../../src/privacy/fingerprint/fingerprint-injector';

describe('Consistent Fingerprint Defense & Normalization', () => {
  it('generates internally consistent environments per platform', () => {
    const macEnv = FingerprintConfig.getConsistentEnvironment(true);
    const winEnv = FingerprintConfig.getConsistentEnvironment(false);

    expect(macEnv.hardwareConcurrency).toBe(8);
    expect(macEnv.deviceMemory).toBe(8);
    expect(macEnv.webglVendor).toContain('Apple');
    expect(macEnv.webglRenderer).toContain('Apple');

    expect(winEnv.hardwareConcurrency).toBe(8);
    expect(winEnv.deviceMemory).toBe(8);
    expect(winEnv.webglVendor).toContain('Google Inc.');
    expect(winEnv.webglRenderer).toContain('NVIDIA');
  });

  it('generates deterministic noise without random drift across calls', () => {
    const noiseGenA = FingerprintConfig.createDeterministicNoiseGenerator('profile-seed-123');
    const noiseGenB = FingerprintConfig.createDeterministicNoiseGenerator('profile-seed-123');

    // Given same coordinates and same seed, output MUST be strictly identical
    for (let x = 0; x < 50; x++) {
      for (let y = 0; y < 50; y += 10) {
        expect(noiseGenA(x, y)).toBe(noiseGenB(x, y));
      }
    }
  });

  it('generates complete protective injection scripts for all targets', () => {
    const env = FingerprintConfig.getConsistentEnvironment(true);
    const script = FingerprintInjector.generateInjectionScript(env, 'profile-test', 'balanced');

    expect(script).toContain('hardwareConcurrency');
    expect(script).toContain('deviceMemory');
    expect(script).toContain('getBattery');
    expect(script).toContain('UNMASKED_VENDOR_WEBGL');
    expect(script).toContain('UNMASKED_RENDERER_WEBGL');
    expect(script).toContain('CanvasRenderingContext2D');
    expect(script).toContain('AudioBuffer');
    expect(script).toContain('enumerateDevices');
  });
});

