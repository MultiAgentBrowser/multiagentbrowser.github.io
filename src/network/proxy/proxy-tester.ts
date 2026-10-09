import net from 'net';
import { ProxyConfig } from '../../security/ipc-contracts';

export interface ProxyTestResult {
  success: boolean;
  latencyMs?: number;
  error?: string;
}

export class ProxyTester {
  /**
   * Tests socket reachability to the specified proxy host and port.
   */
  public static testConnection(config: ProxyConfig, timeoutMs = 4000): Promise<ProxyTestResult> {
    return new Promise((resolve) => {
      if (!config.enabled || !config.host) {
        return resolve({
          success: false,
          error: 'Proxy is not configured or host is empty',
        });
      }

      const startTime = Date.now();
      const socket = new net.Socket();

      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        const latencyMs = Date.now() - startTime;
        socket.destroy();
        resolve({
          success: true,
          latencyMs,
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          success: false,
          error: `Connection timed out after ${timeoutMs}ms`,
        });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({
          success: false,
          error: err.message,
        });
      });

      try {
        socket.connect(config.port, config.host);
      } catch (err: any) {
        resolve({
          success: false,
          error: err.message,
        });
      }
    });
  }
}

