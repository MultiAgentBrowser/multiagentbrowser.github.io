import fs from 'fs';
import path from 'path';
import { AppPaths } from '../platform/paths';
import { ProfileRecord } from './profile-model';

export class ProfileStorage {
  private static getManifestPath(): string {
    return path.join(AppPaths.getProfilesDir(), 'profiles.json');
  }

  /**
   * Loads the profiles manifest list from disk.
   */
  public static loadProfilesManifest(): ProfileRecord[] {
    const manifestPath = this.getManifestPath();
    if (!fs.existsSync(manifestPath)) {
      return [];
    }

    try {
      const data = fs.readFileSync(manifestPath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Saves the profiles manifest list to disk atomically.
   */
  public static saveProfilesManifest(profiles: ProfileRecord[]): void {
    const manifestPath = this.getManifestPath();
    const tempPath = `${manifestPath}.tmp`;

    fs.writeFileSync(tempPath, JSON.stringify(profiles, null, 2), 'utf-8');
    fs.renameSync(tempPath, manifestPath);
  }

  /**
   * Ensures an isolated directory exists on disk for a specific profile.
   */
  public static ensureProfileDirectory(profileId: string): string {
    return AppPaths.getProfileStorageDir(profileId);
  }

  /**
   * Recursively removes a profile's isolated directory and all contents.
   */
  public static deleteProfileDirectory(profileId: string): void {
    const profileDir = AppPaths.getProfileStorageDir(profileId);
    if (fs.existsSync(profileDir)) {
      fs.rmSync(profileDir, { recursive: true, force: true });
    }
  }

  /**
   * Cleans up all temporary profiles stored on disk on application startup/shutdown.
   */
  public static cleanupTemporaryProfiles(profiles: ProfileRecord[]): ProfileRecord[] {
    const remaining: ProfileRecord[] = [];

    for (const profile of profiles) {
      if (profile.isTemporary) {
        this.deleteProfileDirectory(profile.id);
      } else {
        remaining.push(profile);
      }
    }

    this.saveProfilesManifest(remaining);
    return remaining;
  }
}

