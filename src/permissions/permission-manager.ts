import { Session } from 'electron';
import {
  PermissionRecord,
  PermissionType,
  PermissionDecision,
} from './permission-model';
import { PermissionStore } from './permission-store';

export class PermissionManager {
  private static cache: Map<string, Map<string, PermissionDecision>> = new Map();

  private static getCacheKey(origin: string, permission: string): string {
    return `${origin}::${permission}`;
  }

  private static ensureProfileCache(profileId: string): Map<string, PermissionDecision> {
    let profileCache = this.cache.get(profileId);
    if (!profileCache) {
      profileCache = new Map();
      const records = PermissionStore.loadPermissions(profileId);
      for (const rec of records) {
        profileCache.set(this.getCacheKey(rec.origin, rec.permission), rec.decision);
      }
      this.cache.set(profileId, profileCache);
    }
    return profileCache;
  }

  /**
   * Sets and persists a permission decision for an origin in a profile.
   */
  public static setPermission(
    profileId: string,
    origin: string,
    permission: PermissionType,
    decision: PermissionDecision
  ): void {
    const profileCache = this.ensureProfileCache(profileId);
    profileCache.set(this.getCacheKey(origin, permission), decision);

    // Persist to disk
    const records = PermissionStore.loadPermissions(profileId).filter(
      (r) => !(r.origin === origin && r.permission === permission)
    );

    records.push({
      profileId,
      origin,
      permission,
      decision,
      updatedAt: Date.now(),
    });

    PermissionStore.savePermissions(profileId, records);
  }

  /**
   * Retrieves the permission decision for an origin.
   */
  public static getPermission(
    profileId: string,
    origin: string,
    permission: string
  ): PermissionDecision {
    const profileCache = this.ensureProfileCache(profileId);
    return profileCache.get(this.getCacheKey(origin, permission)) || 'ask';
  }

  public static listPermissions(profileId: string): PermissionRecord[] {
    return PermissionStore.loadPermissions(profileId);
  }

  public static resetPermissions(profileId: string): void {
    this.cache.delete(profileId);
    PermissionStore.savePermissions(profileId, []);
  }

  /**
   * Configures Electron native permission request and check handlers for a profile session.
   */
  public static attachPermissionHandlers(targetSession: Session, profileId: string): void {
    targetSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      const origin = details.requestingUrl ? new URL(details.requestingUrl).origin : '';
      const decision = this.getPermission(profileId, origin, permission);

      if (decision === 'allow') {
        return callback(true);
      }
      if (decision === 'block') {
        return callback(false);
      }

      // If 'ask', default to secure deny unless explicitly granted
      callback(false);
    });

    targetSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
      const decision = this.getPermission(profileId, requestingOrigin, permission);
      return decision === 'allow';
    });
  }
}

