import fs from 'fs';
import path from 'path';
import { AppPaths } from '../platform/paths';
import { ProfileRecord } from './profile-model';
import { ProfileDatabase } from '../database/profile-database';
import { ProfileLock } from './profile-lock';

export class ProfileStorage {
  private static readonly demoProfileIds = new Set(['default', 'profile-work', 'profile-testing']);

  private static getManifestPath(): string {
    return path.join(AppPaths.getProfilesDir(), 'profiles.json');
  }

  /**
   * Loads the profiles manifest list from disk / database.
   */
  public static loadProfilesManifest(): ProfileRecord[] {
    const db = ProfileDatabase.getInstance();
    const dbRows = db.getAllProfiles();

    if (dbRows.length > 0) {
      return dbRows.map((row) => ({
        id: row.profile.id,
        name: row.profile.name,
        storagePath: row.profile.storage_path || AppPaths.getProfileStorageDir(row.profile.id),
        isTemporary: Boolean(row.profile.is_temporary),
        status: row.profile.status,
        lastUsedAt: row.profile.last_used_at,
        privacyLevel: (row.privacy?.privacy_level as any) || 'balanced',
        webrtcPolicy: (row.privacy?.webrtc_policy as any) || 'default_public_interface_only',
        proxy: row.proxy
          ? {
              enabled: Boolean(row.proxy.enabled),
              mode: row.proxy.mode as any,
              host: row.proxy.host,
              port: row.proxy.port,
              username: row.proxy.username || undefined,
              password: row.proxy.password || undefined,
            }
          : { enabled: false, mode: 'direct', host: '', port: 8080 },
        os: (row.browser?.os as any) || 'mac',
        browserType: (row.browser?.browser_type as any) || 'chrome',
        browserVersion: row.browser?.browser_version || '150.0.0.0',
        customUserAgent: row.browser?.custom_user_agent || undefined,
        notes: row.profile.notes || '',
        group: (row.profile as any).group || 'Default',
        tags: (() => {
          try {
            return row.profile.tags ? JSON.parse(row.profile.tags) : [];
          } catch {
            return [];
          }
        })(),
        color: row.profile.color || '#3b82f6',
        createdAt: row.profile.created_at,
        updatedAt: row.profile.updated_at || row.profile.created_at,
      }));
    }

    // Fallback to legacy manifest if db was empty
    const manifestPath = this.getManifestPath();
    if (!fs.existsSync(manifestPath)) {
      return [];
    }

    try {
      const data = fs.readFileSync(manifestPath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.map((p) => ({
          ...p,
          group: p.group || 'Default',
          storagePath: p.storagePath || AppPaths.getProfileStorageDir(p.id),
          status: p.status || 'stopped',
          lastUsedAt: p.lastUsedAt || null,
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Saves the profiles manifest list to disk and database atomically.
   */
  public static saveProfilesManifest(profiles: ProfileRecord[], profileIds = profiles.map((profile) => profile.id)): void {
    const db = ProfileDatabase.getInstance();

    for (const profile of profiles.filter((item) => profileIds.includes(item.id))) {
      const storagePath = AppPaths.getProfileStorageDir(profile.id);
      db.insertProfile(
        {
          id: profile.id,
          name: profile.name,
          storage_path: storagePath,
          created_at: profile.createdAt,
          updated_at: profile.updatedAt,
          last_used_at: profile.lastUsedAt || null,
          status: profile.status || 'stopped',
          is_temporary: profile.isTemporary ? 1 : 0,
          color: profile.color,
          notes: profile.notes || '',
          tags: JSON.stringify(profile.tags || []),
          group: (profile as any).group || 'Default',
        },
        {
          profile_id: profile.id,
          enabled: profile.proxy.enabled ? 1 : 0,
          mode: profile.proxy.mode,
          host: profile.proxy.host,
          port: profile.proxy.port,
          username: profile.proxy.username || '',
          password: profile.proxy.password || '',
        },
        {
          profile_id: profile.id,
          privacy_level: profile.privacyLevel,
          webrtc_policy: profile.webrtcPolicy,
          block_trackers: 1,
          fingerprint_protection: 1,
        },
        {
          profile_id: profile.id,
          browser_type: profile.browserType || 'chrome',
          browser_version: profile.browserVersion || '150.0.0.0',
          os: profile.os || 'mac',
          custom_flags: '',
          custom_user_agent: profile.customUserAgent || '',
        }
      );
    }

    // Also write JSON manifest for legacy redundancy
    const manifestPath = this.getManifestPath();
    const manifestDir = path.dirname(manifestPath);
    if (!fs.existsSync(manifestDir)) {
      fs.mkdirSync(manifestDir, { recursive: true });
    }

    const tempPath = `${manifestPath}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(tempPath, JSON.stringify(profiles, null, 2), 'utf-8');
      fs.renameSync(tempPath, manifestPath);
    } catch {
      fs.writeFileSync(manifestPath, JSON.stringify(profiles, null, 2), 'utf-8');
    }
  }

  public static replaceProfilesManifest(profiles: ProfileRecord[]): void {
    const retainedIds = new Set(profiles.map((profile) => profile.id));
    const db = ProfileDatabase.getInstance();
    for (const { profile } of db.getAllProfiles()) {
      if (!retainedIds.has(profile.id)) db.deleteProfile(profile.id);
    }
    this.saveProfilesManifest(profiles);
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
      try {
        fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      } catch {
        // Fallback or ignore if already cleaned
      }
    }
    const db = ProfileDatabase.getInstance();
    db.deleteProfile(profileId);
  }

  public static isDemoOrTestProfile(profile: { id: string; name: string }): boolean {
    if (this.demoProfileIds.has(profile.id)) return true;
    const lowerName = (profile.name || '').trim().toLowerCase();
    return lowerName === 'keep me' || lowerName.startsWith('demo');
  }

  public static removeDemoProfiles(profiles: ProfileRecord[]): ProfileRecord[] {
    const remaining = profiles.filter((profile) => !this.isDemoOrTestProfile(profile));
    const removedProfiles = profiles.filter((profile) => this.isDemoOrTestProfile(profile));
    if (removedProfiles.length === 0) return profiles;

    for (const profile of removedProfiles) this.deleteProfileDirectory(profile.id);
    this.saveProfilesManifest(remaining, []);
    return remaining;
  }

  /**
   * Cleans up all temporary profiles stored on disk on application startup/shutdown.
   */
  public static cleanupTemporaryProfiles(profiles: ProfileRecord[]): ProfileRecord[] {
    const remaining: ProfileRecord[] = [];

    for (const profile of profiles) {
      if (profile.isTemporary && !ProfileLock.isLocked(profile.id)) {
        this.deleteProfileDirectory(profile.id);
      } else {
        remaining.push(profile);
      }
    }

    this.saveProfilesManifest(remaining, []);
    return remaining;
  }
}
