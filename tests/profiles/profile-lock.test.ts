import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileLock } from '../../src/profiles/profile-lock';
import { AppPaths } from '../../src/platform/paths';
import fs from 'fs';
import path from 'path';

describe('Profile Locking & Concurrency Protection', () => {
  const testProfileId = 'profile-test-lock-001';

  beforeEach(() => {
    ProfileLock.release(testProfileId);
    const lockFile = path.join(AppPaths.getProfileStorageDir(testProfileId), '.profile.lock');
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  });

  it('acquires lock exclusively on a profile', () => {
    const firstAcquire = ProfileLock.acquire(testProfileId);
    expect(firstAcquire).toBe(true);
    expect(ProfileLock.isLocked(testProfileId)).toBe(true);

    // Second acquire attempt by same or another instance should fail
    const secondAcquire = ProfileLock.acquire(testProfileId);
    expect(secondAcquire).toBe(false);
  });

  it('releases lock cleanly allowing subsequent acquisition', () => {
    ProfileLock.acquire(testProfileId);
    expect(ProfileLock.isLocked(testProfileId)).toBe(true);

    ProfileLock.release(testProfileId);
    expect(ProfileLock.isLocked(testProfileId)).toBe(false);

    // Can be acquired again
    const reacquired = ProfileLock.acquire(testProfileId);
    expect(reacquired).toBe(true);
    ProfileLock.release(testProfileId);
  });

  it('transfers lock ownership to a separate profile process', () => {
    expect(ProfileLock.acquire(testProfileId)).toBe(true);
    expect(ProfileLock.transfer(testProfileId, process.pid, process.pid)).toBe(true);
    expect(ProfileLock.getOwnerPid(testProfileId)).toBe(process.pid);
    expect(ProfileLock.release(testProfileId, process.pid + 1)).toBe(false);
    expect(ProfileLock.isLocked(testProfileId)).toBe(true);
    ProfileLock.release(testProfileId);
  });

  it('safely clears and recovers from stale crash locks', () => {
    const lockPath = path.join(AppPaths.getProfileStorageDir(testProfileId), '.profile.lock');
    // Simulate stale lock written by a non-existent dead PID (e.g., 9999999)
    const deadLockData = {
      profileId: testProfileId,
      pid: 9999999,
      acquiredAt: Date.now() - 60000,
    };
    fs.writeFileSync(lockPath, JSON.stringify(deadLockData, null, 2), 'utf-8');

    // isLocked should detect dead PID and clear stale lock
    const isLocked = ProfileLock.isLocked(testProfileId);
    expect(isLocked).toBe(false);

    // New process should successfully acquire the lock
    const acquired = ProfileLock.acquire(testProfileId);
    expect(acquired).toBe(true);
    ProfileLock.release(testProfileId);
  });
});
