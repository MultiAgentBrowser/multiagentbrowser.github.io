import { session } from 'electron';

export type StorageCategory =
  | 'cookies'
  | 'filesystem'
  | 'indexdb'
  | 'localstorage'
  | 'shadercache'
  | 'websql'
  | 'serviceworkers'
  | 'cachestorage';

export class StorageCleaner {
  /**
   * Completely clears browser storage for a specific profile partition.
   */
  public static async clearProfileStorage(
    profileId: string,
    categories?: StorageCategory[]
  ): Promise<void> {
    const targetSession = session.fromPartition(`persist:${profileId}`);

    const storagesToClear: StorageCategory[] = categories || [
      'cookies',
      'localstorage',
      'indexdb',
      'serviceworkers',
      'cachestorage',
      'filesystem',
      'shadercache',
    ];

    await targetSession.clearStorageData({
      storages: storagesToClear,
    });

    // Also clear the HTTP and code caches
    await targetSession.clearCache();
  }

  /**
   * Cleans up all traces of an ephemeral/temporary profile.
   */
  public static async wipeTemporaryProfile(profileId: string): Promise<void> {
    await this.clearProfileStorage(profileId);
    const targetSession = session.fromPartition(`persist:${profileId}`);
    await targetSession.clearAuthCache();
    await targetSession.closeAllConnections();
  }
}
