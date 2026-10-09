import { describe, it, expect } from 'vitest';
import { PrivacyEngine } from '../../src/privacy/privacy-engine';

describe('PrivacyEngine Configurations & Scoring', () => {
  it('provides distinct configurations for standard, balanced, and strict presets', () => {
    const standard = PrivacyEngine.getPresetConfig('standard');
    const balanced = PrivacyEngine.getPresetConfig('balanced');
    const strict = PrivacyEngine.getPresetConfig('strict');

    expect(standard.blockFingerprintingScripts).toBe(false);
    expect(balanced.blockFingerprintingScripts).toBe(true);
    expect(strict.blockFingerprintingScripts).toBe(true);

    expect(standard.webrtcPolicy).toBe('default_public_interface_only');
    expect(strict.webrtcPolicy).toBe('disable_non_proxied_udp');

    expect(standard.normalizeHardwareConcurrency).toBe(false);
    expect(balanced.normalizeHardwareConcurrency).toBe(true);
    expect(strict.normalizeHardwareConcurrency).toBe(true);
  });

  it('accurately computes dynamic privacy score across configurations', () => {
    const strictConfig = PrivacyEngine.getPresetConfig('strict');
    const standardConfig = PrivacyEngine.getPresetConfig('standard');

    // Strict with HTTPS and Proxy should reach near or at 100
    const strictScore = PrivacyEngine.calculatePrivacyScore(strictConfig, true, true);
    expect(strictScore).toBe(100);

    // Standard without proxy and without strict webrtc
    const standardScore = PrivacyEngine.calculatePrivacyScore(standardConfig, true, false);
    expect(standardScore).toBeGreaterThan(60);
    expect(standardScore).toBeLessThan(strictScore);

    // Non-HTTPS should penalize score by 10 points
    const insecureScore = PrivacyEngine.calculatePrivacyScore(strictConfig, false, true);
    expect(insecureScore).toBe(90);
  });

  it('tracks and aggregates per-profile telemetry', () => {
    const profileId = 'test-telemetry-profile';
    PrivacyEngine.configureProfile(profileId, 'balanced');

    PrivacyEngine.recordTrackerBlocked(profileId);
    PrivacyEngine.recordTrackerBlocked(profileId);
    PrivacyEngine.recordFingerprintAttempt(profileId);
    PrivacyEngine.recordCookieBlocked(profileId);

    const stats = PrivacyEngine.getPrivacyStats(profileId, true, false);
    expect(stats.trackersBlocked).toBe(2);
    expect(stats.fingerprintingAttemptsBlocked).toBe(1);
    expect(stats.cookiesBlocked).toBe(1);
    expect(stats.webrtcProtected).toBe(true);
    expect(stats.privacyScore).toBeGreaterThan(80);
  });
});

