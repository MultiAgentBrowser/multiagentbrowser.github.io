import { Session } from 'electron';
import { ProxyConfig } from '../../security/ipc-contracts';

export class ProxyManager {
  /**
   * Translates a ProxyConfig object into a standard Chromium proxy rules string.
   */
  public static buildProxyRules(config: ProxyConfig): string {
    if (!config.enabled || config.mode === 'direct' || !config.host) {
      return 'direct://';
    }

    const host = config.host.trim();
    const port = config.port || 8080;

    switch (config.mode) {
      case 'socks5':
        return `socks5://${host}:${port}`;
      case 'http':
        return `http://${host}:${port}`;
      case 'https':
        return `https://${host}:${port}`;
      default:
        return 'direct://';
    }
  }

  /**
   * Applies proxy rules to a specific profile session.
   */
  public static async applyProxyConfig(targetSession: Session, config: ProxyConfig): Promise<void> {
    const proxyRules = this.buildProxyRules(config);

    if (proxyRules === 'direct://') {
      await targetSession.setProxy({ mode: 'direct' });
      return;
    }

    await targetSession.setProxy({
      proxyRules,
      proxyBypassRules: '<local>',
    });
  }
}

