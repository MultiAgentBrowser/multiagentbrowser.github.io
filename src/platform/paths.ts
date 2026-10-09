import path from 'path';
import os from 'os';
import fs from 'fs';

export class AppPaths {
  private static appName = 'PrivacyBrowser';

  /**
   * Resolves the root application data directory:
   * - macOS: ~/Library/Application Support/PrivacyBrowser
   * - Windows: %APPDATA%/PrivacyBrowser
   * - Linux: ~/.config/PrivacyBrowser
   */
  public static getAppDataDir(): string {
    const platform = process.platform;
    let baseDir = '';

    if (platform === 'darwin') {
      baseDir = path.join(os.homedir(), 'Library', 'Application Support', this.appName);
    } else if (platform === 'win32') {
      const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      baseDir = path.join(appData, this.appName);
    } else {
      const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
      baseDir = path.join(xdgConfig, this.appName);
    }

    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    return baseDir;
  }

  /**
   * Resolves the Profiles directory:
   * AppData/Profiles/
   */
  public static getProfilesDir(): string {
    const profilesDir = path.join(this.getAppDataDir(), 'Profiles');
    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir, { recursive: true });
    }
    return profilesDir;
  }

  /**
   * Resolves a dedicated storage folder for a specific profile ID.
   * Enforces directory traversal protection.
   */
  public static getProfileStorageDir(profileId: string): string {
    // Sanitize profileId to prevent path traversal
    const sanitized = profileId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!sanitized) {
      throw new Error(`Invalid profile ID: ${profileId}`);
    }

    const profileDir = path.join(this.getProfilesDir(), sanitized);
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    // Ensure completely separate profile storage subdirectories
    const subdirs = [
      'cookies',
      'cache',
      'local-storage',
      'indexed-db',
      'session',
      'preferences',
      'downloads',
    ];
    for (const sub of subdirs) {
      const subPath = path.join(profileDir, sub);
      if (!fs.existsSync(subPath)) {
        fs.mkdirSync(subPath, { recursive: true });
      }
    }

    return profileDir;
  }

  /**
   * Returns path to a specific isolated subdirectory within a profile's directory.
   */
  public static getProfileSubdir(
    profileId: string,
    subdir: 'cookies' | 'cache' | 'local-storage' | 'indexed-db' | 'session' | 'preferences' | 'downloads'
  ): string {
    const profileDir = this.getProfileStorageDir(profileId);
    return path.join(profileDir, subdir);
  }
}

