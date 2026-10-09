import fs from 'fs';
import path from 'path';
import { AppPaths } from '../platform/paths';

export interface LockInfo {
  profileId: string;
  pid: number;
  acquiredAt: number;
}

export class ProfileLock {
  private static getLockFilePath(profileId: string): string {
    const profileDir = AppPaths.getProfileStorageDir(profileId);
    return path.join(profileDir, '.profile.lock');
  }

  /**
   * Attempts to acquire an exclusive lock on the profile storage directory.
   * Returns true if lock was acquired, false if already locked by an active process.
   */
  public static acquire(profileId: string): boolean {
    const lockPath = this.getLockFilePath(profileId);

    if (fs.existsSync(lockPath)) {
      try {
        const raw = fs.readFileSync(lockPath, 'utf-8');
        const lockInfo: LockInfo = JSON.parse(raw);

        // Check if the process holding the lock is still alive
        if (this.isProcessRunning(lockInfo.pid)) {
          // Profile is currently running and locked
          return false;
        } else {
          // Stale lock detected (previous crash/unclean shutdown)
          this.removeLock(profileId);
        }
      } catch {
        // Corrupted lock file, safe to remove and re-acquire
        this.removeLock(profileId);
      }
    }

    try {
      const lockData: LockInfo = {
        profileId,
        pid: process.pid,
        acquiredAt: Date.now(),
      };
      fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2), { flag: 'wx' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Releases the exclusive lock for the profile.
   */
  public static release(profileId: string, ownerPid = process.pid): boolean {
    const lockPath = this.getLockFilePath(profileId);
    if (!fs.existsSync(lockPath)) return false;

    try {
      const lockInfo: LockInfo = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      if (lockInfo.pid === ownerPid) {
        this.removeLock(profileId);
        return true;
      }
    } catch {
      this.removeLock(profileId);
      return true;
    }
    return false;
  }

  public static transfer(profileId: string, fromPid: number, toPid: number): boolean {
    const lockPath = this.getLockFilePath(profileId);
    try {
      const lockInfo: LockInfo = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      if (lockInfo.pid !== fromPid || !this.isProcessRunning(toPid)) return false;
      fs.writeFileSync(lockPath, JSON.stringify({
        ...lockInfo,
        pid: toPid,
      }, null, 2));
      return true;
    } catch {
      return false;
    }
  }

  public static getOwnerPid(profileId: string): number | null {
    const lockPath = this.getLockFilePath(profileId);
    if (!fs.existsSync(lockPath)) return null;

    try {
      const lockInfo: LockInfo = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      if (this.isProcessRunning(lockInfo.pid)) return lockInfo.pid;
      this.removeLock(profileId);
    } catch {
      this.removeLock(profileId);
    }
    return null;
  }

  /**
   * Checks if a profile is currently locked by a running process.
   */
  public static isLocked(profileId: string): boolean {
    const lockPath = this.getLockFilePath(profileId);
    if (!fs.existsSync(lockPath)) return false;

    try {
      const raw = fs.readFileSync(lockPath, 'utf-8');
      const lockInfo: LockInfo = JSON.parse(raw);
      if (this.isProcessRunning(lockInfo.pid)) {
        return true;
      }
      // Stale lock
      this.removeLock(profileId);
      return false;
    } catch {
      return false;
    }
  }

  private static removeLock(profileId: string): void {
    const lockPath = this.getLockFilePath(profileId);
    if (!fs.existsSync(lockPath)) return;
    try {
      fs.unlinkSync(lockPath);
    } catch {
      // A concurrent process may already have removed the stale lock.
    }
  }

  /**
   * Checks if a given PID is currently active.
   */
  private static isProcessRunning(pid: number): boolean {
    if (!pid || pid <= 0) return false;
    try {
      // Sending signal 0 checks for process existence without killing it
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === 'EPERM';
    }
  }
}
