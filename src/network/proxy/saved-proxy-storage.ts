import fs from 'fs';
import path from 'path';
import { AppPaths } from '../../platform/paths';
import { SavedProxy, SavedProxySchema } from '../../security/ipc-contracts';

export class SavedProxyStorage {
  private static getFilePath(): string {
    return path.join(AppPaths.getAppDataDir(), 'saved-proxies.json');
  }

  public static list(): SavedProxy[] {
    const file = this.getFilePath();
    if (!fs.existsSync(file)) return [];
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => SavedProxySchema.safeParse(item))
          .filter((res): res is { success: true; data: SavedProxy } => res.success)
          .map((res) => res.data);
      }
      return [];
    } catch {
      return [];
    }
  }

  public static save(proxy: SavedProxy): SavedProxy {
    const list = this.list();
    const existingIndex = list.findIndex((p) => p.id === proxy.id);
    if (existingIndex >= 0) {
      list[existingIndex] = proxy;
    } else {
      list.unshift(proxy);
    }
    this.write(list);
    return proxy;
  }

  public static delete(id: string): boolean {
    const list = this.list();
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length !== list.length) {
      this.write(filtered);
      return true;
    }
    return false;
  }

  private static write(proxies: SavedProxy[]): void {
    const file = this.getFilePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(proxies, null, 2), 'utf-8');
  }
}

