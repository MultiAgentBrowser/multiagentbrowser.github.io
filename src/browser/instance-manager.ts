import { spawn } from 'child_process';
import { BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { ProfileLock } from '../profiles/profile-lock';
import { ProfileManager } from '../profiles/profile-manager';
import { IPC_CHANNELS } from '../security/ipc-contracts';
import { getBrowserExecutable, getChromeExecutable } from './chrome-launcher';
import { createProxyAuthExtension } from './proxy-extension';
import { AppPaths } from '../platform/paths';
import { ProxyManager } from '../network/proxy/proxy-manager';
import { getEffectiveUserAgent } from '../profiles/browser-definitions';
import { ProfileStorage } from '../profiles/profile-storage';
import { createFingerprintProtectionExtension } from '../privacy/fingerprint/fingerprint-extension';

export class BrowserInstanceManager {
  private static mainWindow: BrowserWindow | null = null;
  private static profileManager: ProfileManager | null = null;

  public static setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win;
  }

  public static setProfileManager(pm: ProfileManager): void {
    this.profileManager = pm;
  }

  public static getRunningProfileIds(): string[] {
    return (this.profileManager?.listProfiles() || [])
      .filter((profile) => ProfileLock.isLocked(profile.id))
      .map((profile) => profile.id);
  }

  public static broadcastRunningProfiles(): void {
    const running = this.getRunningProfileIds();
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.PROFILE_RUNNING_UPDATED, running);
    }
  }

  public static async launchProfile(
    profileId: string
  ): Promise<{ success: boolean; profileId: string; focused?: boolean }> {
    if (!this.profileManager?.getProfile(profileId)) {
      throw new Error(`Profile not found: ${profileId}`);
    }
    const profile = this.profileManager.getProfile(profileId)!;

    if (ProfileLock.isLocked(profileId) || !ProfileLock.acquire(profileId)) {
      return { success: false, profileId };
    }

    try {
      const { executablePath } = getBrowserExecutable(profile.browserType);
      const userDataPath = path.join(AppPaths.getProfileStorageDir(profileId), 'ChromiumProfileData');
      fs.mkdirSync(userDataPath, { recursive: true });
      const proxyRules = ProxyManager.buildProxyRules(profile.proxy);
      const extensionPaths = [
        createFingerprintProtectionExtension(
          path.join(userDataPath, 'FingerprintProtectionExtension'),
          profile.id,
          profile.os,
          profile.privacyLevel
        ),
      ];

      const args = [
        `--user-data-dir=${userDataPath}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--new-window',
        `--user-agent=${getEffectiveUserAgent(profile.browserType, profile.browserVersion, profile.os, profile.customUserAgent)}`,
        `--force-webrtc-ip-handling-policy=${profile.webrtcPolicy}`,
        `--proxy-server=${proxyRules}`,
        '--proxy-bypass-list=<local>',
      ];

      // If proxy authentication credentials are provided, load the ephemeral proxy auth extension
      if (profile.proxy.enabled && profile.proxy.username && profile.proxy.password) {
        extensionPaths.push(createProxyAuthExtension(
          path.join(userDataPath, 'ProxyAuthExtension'),
          profile.proxy.username,
          profile.proxy.password
        ));
      }

      args.push(`--load-extension=${extensionPaths.join(',')}`);
      args.push(`--disable-extensions-except=${extensionPaths.join(',')}`);
      args.push('https://duckduckgo.com');

      const child = spawn(executablePath, args, { detached: true, stdio: 'ignore' });
      return await new Promise((resolve, reject) => {
        child.once('error', (error) => {
          ProfileLock.release(profileId, child.pid || process.pid);
          this.profileManager?.updateProfileStatus(profileId, 'crashed');
          this.broadcastRunningProfiles();
          console.error(`Could not launch browser for profile ${profileId}:`, error);
          reject(error);
        });
        child.once('spawn', () => {
          if (!child.pid || !ProfileLock.transfer(profileId, process.pid, child.pid)) {
            child.kill();
            ProfileLock.release(profileId);
            this.profileManager?.updateProfileStatus(profileId, 'crashed');
            reject(new Error(`Could not acquire Chromium process lock for profile ${profileId}`));
            return;
          }

          child.unref();
          this.profileManager?.updateProfileStatus(profileId, 'running');
          this.broadcastRunningProfiles();
          resolve({ success: true, profileId });
        });
        child.once('exit', (code, signal) => {
          const lockReleased = child.pid
            ? ProfileLock.release(profileId, child.pid)
            : ProfileLock.release(profileId);
          if (lockReleased) {
            this.profileManager?.updateProfileStatus(profileId, code === 0 || signal !== null ? 'stopped' : 'crashed');
            if (profile.isTemporary) ProfileStorage.deleteProfileDirectory(profileId);
            this.broadcastRunningProfiles();
          }
          if (code !== 0 && signal === null) {
            console.error(`Google Chrome exited unexpectedly for profile ${profileId} with code ${code}`);
          }
        });
      });
    } catch (error) {
      ProfileLock.release(profileId);
      throw error;
    }
  }

  public static async stopProfile(profileId: string): Promise<boolean> {
    const ownerPid = ProfileLock.getOwnerPid(profileId);
    if (!ownerPid) return false;

    try {
      process.kill(ownerPid, 'SIGTERM');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
    }

    const timeout = Date.now() + 2000;
    while (ProfileLock.isLocked(profileId) && Date.now() < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return !ProfileLock.isLocked(profileId);
  }
}
