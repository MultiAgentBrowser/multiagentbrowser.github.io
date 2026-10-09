import {
  ProfileRecord,
  CreateProfileDTO,
  UpdateProfileDTO,
  ProfileExport,
  ProfileExportSchema,
} from './profile-model';
import { ProfileStorage } from './profile-storage';

export class ProfileManager {
  private profiles: Map<string, ProfileRecord> = new Map();
  private activeProfileId: string = 'default';

  constructor() {
    this.init();
  }

  private init(): void {
    const loaded = ProfileStorage.loadProfilesManifest();
    const cleaned = ProfileStorage.cleanupTemporaryProfiles(loaded);

    if (cleaned.length === 0) {
      // Create initial profiles: Personal, Work, Testing
      const personal = this.createProfileInternal({
        id: 'default',
        name: 'Personal',
        isTemporary: false,
        privacyLevel: 'balanced',
        webrtcPolicy: 'default_public_interface_only',
        proxy: { enabled: false, mode: 'direct', host: '', port: 8080 },
        color: '#3b82f6',
      });

      this.createProfileInternal({
        id: 'profile-work',
        name: 'Work',
        isTemporary: false,
        privacyLevel: 'balanced',
        webrtcPolicy: 'default_public_interface_only',
        proxy: { enabled: false, mode: 'direct', host: '', port: 8080 },
        color: '#10b981',
      });

      this.createProfileInternal({
        id: 'profile-testing',
        name: 'Testing',
        isTemporary: false,
        privacyLevel: 'strict',
        webrtcPolicy: 'disable_non_proxied_udp',
        proxy: { enabled: false, mode: 'direct', host: '', port: 8080 },
        color: '#f59e0b',
      });

      this.activeProfileId = personal.id;
      this.persist();
    } else {
      for (const p of cleaned) {
        this.profiles.set(p.id, p);
      }
      this.activeProfileId = cleaned[0].id;
    }
  }

  private createProfileInternal(data: {
    id: string;
    name: string;
    isTemporary: boolean;
    privacyLevel: 'standard' | 'balanced' | 'strict';
    webrtcPolicy: 'default' | 'default_public_interface_only' | 'disable_non_proxied_udp';
    proxy: any;
    os?: 'mac' | 'windows';
    browserType?: 'chrome' | 'edge' | 'brave';
    browserVersion?: string;
    notes?: string;
    tags?: string[];
    color: string;
  }): ProfileRecord {
    const now = Date.now();
    const storagePath = ProfileStorage.ensureProfileDirectory(data.id);
    const profile: ProfileRecord = {
      ...data,
      storagePath,
      status: 'stopped',
      lastUsedAt: null,
      os: data.os || 'mac',
      browserType: data.browserType || 'chrome',
      browserVersion: data.browserVersion || '131.0.6778.86',
      notes: data.notes || '',
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }

  public createProfile(dto: CreateProfileDTO): ProfileRecord {
    this.refreshProfiles();
    const id = `profile-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const profile = this.createProfileInternal({
      id,
      name: dto.name.trim(),
      isTemporary: dto.isTemporary || false,
      privacyLevel: dto.privacyLevel || 'balanced',
      webrtcPolicy: dto.webrtcPolicy || 'default_public_interface_only',
      proxy: dto.proxy || { enabled: false, mode: 'direct', host: '', port: 8080 },
      os: dto.os || 'mac',
      browserType: dto.browserType || 'chrome',
      browserVersion: dto.browserVersion || '131.0.6778.86',
      notes: dto.notes || '',
      tags: dto.tags || [],
      color: dto.color || '#8b5cf6',
    });

    this.persist([profile.id]);
    return profile;
  }

  public getProfile(profileId: string): ProfileRecord | undefined {
    this.refreshProfiles();
    return this.profiles.get(profileId);
  }

  public listProfiles(): ProfileRecord[] {
    this.refreshProfiles();
    return Array.from(this.profiles.values());
  }

  public getActiveProfile(): ProfileRecord {
    this.refreshProfiles();
    const active = this.profiles.get(this.activeProfileId);
    if (active) return active;
    const fallback = Array.from(this.profiles.values())[0];
    this.activeProfileId = fallback.id;
    return fallback;
  }

  public setActiveProfile(profileId: string): boolean {
    this.refreshProfiles();
    if (this.profiles.has(profileId)) {
      this.activeProfileId = profileId;
      return true;
    }
    return false;
  }

  public updateProfile(profileId: string, dto: UpdateProfileDTO): ProfileRecord {
    this.refreshProfiles();
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    if (dto.name !== undefined) profile.name = dto.name.trim();
    if (dto.privacyLevel !== undefined) profile.privacyLevel = dto.privacyLevel;
    if (dto.webrtcPolicy !== undefined) profile.webrtcPolicy = dto.webrtcPolicy;
    if (dto.proxy !== undefined) profile.proxy = dto.proxy;
    if (dto.os !== undefined) profile.os = dto.os;
    if (dto.browserType !== undefined) profile.browserType = dto.browserType;
    if (dto.browserVersion !== undefined) profile.browserVersion = dto.browserVersion;
    if (dto.notes !== undefined) profile.notes = dto.notes;
    if (dto.tags !== undefined) profile.tags = dto.tags;
    if (dto.color !== undefined) profile.color = dto.color;
    profile.updatedAt = Date.now();

    this.persist([profileId]);
    return profile;
  }

  public updateProfileStatus(profileId: string, status: 'stopped' | 'running' | 'crashed'): void {
    this.refreshProfiles();
    const profile = this.profiles.get(profileId);
    if (profile) {
      profile.status = status;
      if (status === 'running') {
        profile.lastUsedAt = Date.now();
      }
      profile.updatedAt = Date.now();
      this.persist([profileId]);
    }
  }

  public renameProfile(profileId: string, newName: string): ProfileRecord {
    return this.updateProfile(profileId, { name: newName });
  }

  public duplicateProfile(profileId: string, newName?: string): ProfileRecord {
    this.refreshProfiles();
    const source = this.profiles.get(profileId);
    if (!source) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    const duplicatedName = newName || `${source.name} (Copy)`;
    return this.createProfile({
      name: duplicatedName,
      isTemporary: source.isTemporary,
      privacyLevel: source.privacyLevel,
      webrtcPolicy: source.webrtcPolicy,
      proxy: { ...source.proxy },
      os: source.os,
      browserType: source.browserType,
      browserVersion: source.browserVersion,
      notes: source.notes,
      tags: [...source.tags],
      color: source.color,
    });
  }

  public deleteProfile(profileId: string): boolean {
    this.refreshProfiles();
    if (this.profiles.size <= 1) {
      throw new Error('Cannot delete the last remaining profile');
    }

    const profile = this.profiles.get(profileId);
    if (!profile) return false;

    // Delete directory
    ProfileStorage.deleteProfileDirectory(profileId);
    this.profiles.delete(profileId);

    // If active profile was deleted, switch to another
    if (this.activeProfileId === profileId) {
      this.activeProfileId = Array.from(this.profiles.values())[0].id;
    }

    this.persist([profile.id]);
    return true;
  }

  public exportProfile(profileId: string): string {
    this.refreshProfiles();
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    const exportData: ProfileExport = {
      version: 1,
      exportedAt: Date.now(),
      profile: { ...profile },
    };

    return JSON.stringify(exportData, null, 2);
  }

  public importProfile(jsonContent: string): ProfileRecord {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      throw new Error('Invalid JSON format for profile import');
    }

    const validated = ProfileExportSchema.parse(parsed);
    const importedProfile = validated.profile;

    // Generate fresh profile ID to avoid conflict
    const newId = `profile-imported-${Date.now()}`;
    return this.createProfile({
      name: `${importedProfile.name} (Imported)`,
      isTemporary: importedProfile.isTemporary,
      privacyLevel: importedProfile.privacyLevel,
      webrtcPolicy: importedProfile.webrtcPolicy,
      proxy: importedProfile.proxy,
      os: importedProfile.os,
      browserType: importedProfile.browserType,
      browserVersion: importedProfile.browserVersion,
      notes: importedProfile.notes,
      tags: importedProfile.tags,
      color: importedProfile.color,
    });
  }

  private persist(profileIds?: string[]): void {
    ProfileStorage.saveProfilesManifest(Array.from(this.profiles.values()), profileIds);
  }

  private refreshProfiles(): void {
    const loaded = ProfileStorage.loadProfilesManifest();
    if (loaded.length === 0) return;

    this.profiles = new Map(loaded.map((profile) => [profile.id, profile]));
    if (!this.profiles.has(this.activeProfileId)) {
      this.activeProfileId = loaded[0].id;
    }
  }
}
