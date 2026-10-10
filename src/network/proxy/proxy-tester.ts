import net from 'net';
import { ProxyConfig } from '../../security/ipc-contracts';

export interface ProxyTestResult {
  success: boolean;
  latencyMs?: number;
  ip?: string;
  country?: string;
  city?: string;
  timezone?: string;
  error?: string;
}

export interface ProxyRotateResult {
  success: boolean;
  message: string;
  newIp?: string;
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

      socket.on('connect', async () => {
        const latencyMs = Date.now() - startTime;
        socket.destroy();

        // Optional: inspect host or ipinfo if host looks like a public IP
        let country: string | undefined;
        let city: string | undefined;
        let timezone: string | undefined;
        const host = config.host.trim();

        if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2000);
            const geoRes = await fetch(`https://ipwho.is/${host}`, { signal: controller.signal });
            clearTimeout(timer);
            if (geoRes.ok) {
              const data = await geoRes.json();
              if (data && data.success) {
                country = data.country || data.country_code;
                city = data.city;
                timezone = data.timezone?.id;
              }
            }
          } catch {
            // Ignore non-blocking geo error
          }
        }

        resolve({
          success: true,
          latencyMs,
          ip: host,
          country,
          city,
          timezone,
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

  /**
   * Trigger an IP change / rotation request using the provider's rotation URL.
   */
  public static async rotateProxyIp(changeIpUrl: string): Promise<ProxyRotateResult> {
    if (!changeIpUrl || !changeIpUrl.trim().startsWith('http')) {
      return {
        success: false,
        message: 'Invalid rotation URL provided. Must start with http:// or https://',
      };
    }

    try {
      const response = await fetch(changeIpUrl.trim(), {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 Antidetect/1.0' },
      });
      const text = await response.text();
      return {
        success: response.ok,
        message: response.ok ? 'Rotation signal sent successfully' : `HTTP Error ${response.status}: ${text.slice(0, 100)}`,
        newIp: text.trim().slice(0, 60),
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to reach rotation endpoint',
      };
    }
  }
}

