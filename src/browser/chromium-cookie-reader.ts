import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { AppPaths } from '../platform/paths';

export interface DecryptedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  expirationDate?: number;
}

export class ChromiumCookieReader {
  private static cachedMacPassword: string | null = null;

  private static getMacKeychainPassword(): string {
    if (this.cachedMacPassword) {
      return this.cachedMacPassword;
    }

    const services = [
      ['Chrome Safe Storage', 'Chrome'],
      ['Chromium Safe Storage', 'Chromium'],
      ['Brave Safe Storage', 'Brave'],
      ['Microsoft Edge Safe Storage', 'Microsoft Edge'],
    ];

    for (const [service, account] of services) {
      try {
        const out = execFileSync(
          'security',
          ['find-generic-password', '-s', service, '-a', account, '-w'],
          { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
        ).trim();
        if (out) {
          this.cachedMacPassword = out;
          return out;
        }
      } catch {}
    }

    return 'mock_password';
  }

  public static readProfileCookies(profileId: string): DecryptedCookie[] {
    const dir = AppPaths.getProfileStorageDir(profileId);
    const candidateDbPaths = [
      path.join(dir, 'ChromiumProfileData', 'Default', 'Cookies'),
      path.join(dir, 'ChromiumProfileData', 'Default', 'Network', 'Cookies'),
      path.join(dir, 'ChromiumProfileData', 'Cookies'),
    ];

    const dbPath = candidateDbPaths.find((p) => fs.existsSync(p));
    if (!dbPath) {
      return [];
    }

    if (process.platform === 'darwin') {
      return this.readMacChromiumCookies(dbPath);
    }

    // Windows / Linux fallback
    return [];
  }

  private static readMacChromiumCookies(dbPath: string): DecryptedCookie[] {
    try {
      const password = this.getMacKeychainPassword();
      const key = crypto.pbkdf2Sync(password, 'saltysalt', 1003, 16, 'sha1');
      const iv = Buffer.alloc(16, 0x20);

      // Query cookies SQLite table
      const query =
        'SELECT host_key, name, path, is_secure, is_httponly, expires_utc, hex(encrypted_value), value FROM cookies;';
      const out = execFileSync('sqlite3', ['-separator', '|||', dbPath, query], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      const lines = out.split('\n').filter(Boolean);
      const results: DecryptedCookie[] = [];

      for (const line of lines) {
        const parts = line.split('|||');
        if (parts.length < 8) continue;
        const [host_key, name, cPath, is_secure, is_httponly, expires_utc, hexVal, plainVal] = parts;
        let value = plainVal || '';

        if (!value && hexVal) {
          try {
            const buf = Buffer.from(hexVal, 'hex');
            if (buf.slice(0, 3).toString() === 'v10') {
              const cipherText = buf.slice(3);
              const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
              decipher.setAutoPadding(true);
              const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
              // Strip 32-byte HMAC prefix present in Chromium 100+
              value = decrypted.length > 32 ? decrypted.slice(32).toString('utf8') : decrypted.toString('utf8');
            }
          } catch {}
        }

        let expirationDate: number | undefined = undefined;
        const expNum = Number(expires_utc);
        if (expNum > 0) {
          expirationDate = Math.floor((expNum - 11644473600000000) / 1000000);
        }

        results.push({
          name,
          value,
          domain: host_key,
          path: cPath || '/',
          secure: is_secure === '1',
          httpOnly: is_httponly === '1',
          expirationDate: expirationDate && expirationDate > 0 ? expirationDate : undefined,
        });
      }

      return results;
    } catch {
      return [];
    }
  }
}

