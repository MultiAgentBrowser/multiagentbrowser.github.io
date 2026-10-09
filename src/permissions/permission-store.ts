import fs from 'fs';
import path from 'path';
import { AppPaths } from '../platform/paths';
import { PermissionRecord } from './permission-model';

export class PermissionStore {
  private static getFilePath(profileId: string): string {
    const profileDir = AppPaths.getProfileStorageDir(profileId);
    return path.join(profileDir, 'permissions.json');
  }

  public static loadPermissions(profileId: string): PermissionRecord[] {
    const filePath = this.getFilePath(profileId);
    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public static savePermissions(profileId: string, records: PermissionRecord[]): void {
    const filePath = this.getFilePath(profileId);
    const tempPath = `${filePath}.tmp`;

    fs.writeFileSync(tempPath, JSON.stringify(records, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  }
}

