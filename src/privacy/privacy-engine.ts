import { PrivacyLevel, WebRTCPolicy, PrivacyStats } from '../security/ipc-contracts';

export interface PrivacyConfig {
  level: PrivacyLevel;
  blockThirdPartyCookies: boolean;
  blockKnownTrackers: boolean;
  blockFingerprintingScripts: boolean;
  webrtcPolicy: WebRTCPolicy;
  canvasProtection: 'off' | 'noise' | 'normalize' | 'block';
  webglProtection: 'off' | 'normalize' | 'strict';
  audioProtection: 'off' | 'normalize' | 'strict';
  normalizeHardwareConcurrency: boolean;
  normalizeDeviceMemory: boolean;
  protectBatteryAPI: boolean;
  protectMediaDevices: boolean;
}

export class PrivacyEngine {
  private static profileConfigs: Map<string, PrivacyConfig> = new Map();
  private static statsByProfile: Map<
    string,
    {
      trackersBlocked: number;
      fingerprintingAttempts: number;
      cookiesBlocked: number;
    }
  > = new Map();

  /**
   * Generates preset privacy configurations based on the privacy level.
   */
  public static getPresetConfig(level: PrivacyLevel): PrivacyConfig {
    switch (level) {
      case 'strict':
        return {
          level: 'strict',
          blockThirdPartyCookies: true,
          blockKnownTrackers: true,
          blockFingerprintingScripts: true,
          webrtcPolicy: 'disable_non_proxied_udp',
          canvasProtection: 'normalize',
          webglProtection: 'strict',
          audioProtection: 'strict',
          normalizeHardwareConcurrency: true,
          normalizeDeviceMemory: true,
          protectBatteryAPI: true,
          protectMediaDevices: true,
        };
      case 'balanced':
        return {
          level: 'balanced',
          blockThirdPartyCookies: true,
          blockKnownTrackers: true,
          blockFingerprintingScripts: true,
          webrtcPolicy: 'default_public_interface_only',
          canvasProtection: 'noise',
          webglProtection: 'normalize',
          audioProtection: 'normalize',
          normalizeHardwareConcurrency: true,
          normalizeDeviceMemory: true,
          protectBatteryAPI: true,
          protectMediaDevices: true,
        };
      case 'standard':
      default:
        return {
          level: 'standard',
          blockThirdPartyCookies: true,
          blockKnownTrackers: true,
          blockFingerprintingScripts: false,
          webrtcPolicy: 'default_public_interface_only',
          canvasProtection: 'noise',
          webglProtection: 'normalize',
          audioProtection: 'normalize',
          normalizeHardwareConcurrency: false,
          normalizeDeviceMemory: false,
          protectBatteryAPI: true,
          protectMediaDevices: false,
        };
    }
  }

  public static configureProfile(profileId: string, level: PrivacyLevel): PrivacyConfig {
    const config = this.getPresetConfig(level);
    this.profileConfigs.set(profileId, config);
    if (!this.statsByProfile.has(profileId)) {
      this.statsByProfile.set(profileId, {
        trackersBlocked: 0,
        fingerprintingAttempts: 0,
        cookiesBlocked: 0,
      });
    }
    return config;
  }

  public static getConfig(profileId: string): PrivacyConfig {
    return this.profileConfigs.get(profileId) || this.getPresetConfig('balanced');
  }

  public static recordTrackerBlocked(profileId: string): void {
    const stats = this.getStatsRecord(profileId);
    stats.trackersBlocked += 1;
  }

  public static recordFingerprintAttempt(profileId: string): void {
    const stats = this.getStatsRecord(profileId);
    stats.fingerprintingAttempts += 1;
  }

  public static recordCookieBlocked(profileId: string): void {
    const stats = this.getStatsRecord(profileId);
    stats.cookiesBlocked += 1;
  }

  private static getStatsRecord(profileId: string) {
    let stats = this.statsByProfile.get(profileId);
    if (!stats) {
      stats = { trackersBlocked: 0, fingerprintingAttempts: 0, cookiesBlocked: 0 };
      this.statsByProfile.set(profileId, stats);
    }
    return stats;
  }

  /**
   * Computes a dynamic Privacy Score (0-100) based on configuration and context.
   */
  public static calculatePrivacyScore(
    config: PrivacyConfig,
    isHttps: boolean = true,
    isProxyConnected: boolean = false
  ): number {
    let score = 0;

    // Tracker protection: 20 pts
    if (config.blockKnownTrackers) score += 15;
    if (config.blockFingerprintingScripts) score += 5;

    // Cookie protection: 20 pts
    if (config.blockThirdPartyCookies) score += 20;

    // WebRTC IP leak protection: 20 pts
    if (config.webrtcPolicy === 'disabled' || config.webrtcPolicy === 'disable_non_proxied_udp') score += 20;
    else if (config.webrtcPolicy === 'default_public_interface_only') score += 15;

    // Fingerprint defenses: 20 pts
    if (config.canvasProtection !== 'off') score += 5;
    if (config.webglProtection !== 'off') score += 5;
    if (config.audioProtection !== 'off') score += 5;
    if (config.normalizeHardwareConcurrency && config.normalizeDeviceMemory) score += 5;

    // Transport Security: 10 pts
    if (isHttps) score += 10;

    // Network privacy: 10 pts
    if (isProxyConnected) score += 10;
    else score += 5; // standard direct connection

    return Math.min(100, Math.max(0, score));
  }

  public static getPrivacyStats(
    profileId: string,
    isHttps: boolean = true,
    isProxyConnected: boolean = false
  ): PrivacyStats {
    const config = this.getConfig(profileId);
    const recorded = this.getStatsRecord(profileId);
    const score = this.calculatePrivacyScore(config, isHttps, isProxyConnected);

    return {
      trackersBlocked: recorded.trackersBlocked,
      fingerprintingAttemptsBlocked: recorded.fingerprintingAttempts,
      cookiesBlocked: recorded.cookiesBlocked,
      privacyScore: score,
      webrtcProtected: config.webrtcPolicy !== 'default',
      proxyConnected: isProxyConnected,
      httpsSecure: isHttps,
    };
  }
}

