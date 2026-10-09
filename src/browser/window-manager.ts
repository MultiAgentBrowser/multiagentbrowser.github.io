import { BrowserInstanceManager } from './instance-manager';

export class BrowserWindowManager {
  public static getRunningProfileIds(): string[] {
    return BrowserInstanceManager.getRunningProfileIds();
  }

  public static broadcastRunningProfiles(): void {
    BrowserInstanceManager.broadcastRunningProfiles();
  }

  public static stopProfileWindow(profileId: string): Promise<boolean> {
    return BrowserInstanceManager.stopProfile(profileId);
  }
}
