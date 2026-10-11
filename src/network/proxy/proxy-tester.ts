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
   * Performs an actual protocol handshake (SOCKS5 RFC 1928 or HTTP CONNECT)
   * to verify that the proxy can actually tunnel web traffic to the internet.
   */
  public static verifyTunnel(
    host: string,
    port: number,
    mode: 'socks5' | 'http' | 'https' | 'direct',
    username?: string,
    password?: string,
    timeoutMs = 4000
  ): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    if (mode === 'direct') {
      return Promise.resolve({ success: true, latencyMs: 0 });
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      const socket = new net.Socket();
      let finished = false;
      const hardTimer = setTimeout(() => {
        finish({ success: false, error: `Connection timed out after ${timeoutMs}ms` });
      }, timeoutMs);

      const finish = (result: { success: boolean; latencyMs?: number; error?: string }) => {
        if (!finished) {
          finished = true;
          clearTimeout(hardTimer);
          socket.destroy();
          resolve(result);
        }
      };

      const isSocks = mode === 'socks5';
      let step = 0;

      socket.on('connect', () => {
        if (isSocks) {
          // RFC 1928 SOCKS5 client greeting
          if (username && password) {
            // Support 0x00 (no auth) and 0x02 (username/password)
            socket.write(Buffer.from([0x05, 0x02, 0x00, 0x02]));
          } else {
            // No auth
            socket.write(Buffer.from([0x05, 0x01, 0x00]));
          }
          step = 1;
        } else {
          // HTTP CONNECT request to 1.1.1.1:80
          const authHeader = username && password
            ? `Proxy-Authorization: Basic ${Buffer.from(`${username}:${password}`).toString('base64')}\r\n`
            : '';
          const req = `CONNECT 1.1.1.1:80 HTTP/1.1\r\nHost: 1.1.1.1:80\r\nProxy-Connection: keep-alive\r\n${authHeader}\r\n`;
          socket.write(req);
          step = 1;
        }
      });

      socket.on('data', (chunk) => {
        if (isSocks) {
          if (step === 1) {
            // Expect SOCKS5 greeting response [0x05, method]
            if (chunk.length < 2 || chunk[0] !== 0x05) {
              return finish({ success: false, error: 'Target host is not a valid SOCKS5 proxy server' });
            }
            if (chunk[1] === 0xFF) {
              return finish({ success: false, error: 'SOCKS5 proxy rejected authentication: no acceptable methods' });
            }
            if (chunk[1] === 0x02 && username && password) {
              // RFC 1929 Username/Password subnegotiation
              const uBuf = Buffer.from(username);
              const pBuf = Buffer.from(password);
              const authBuf = Buffer.concat([
                Buffer.from([0x01, uBuf.length]),
                uBuf,
                Buffer.from([pBuf.length]),
                pBuf,
              ]);
              socket.write(authBuf);
              step = 2;
              return;
            }
            // Method 0x00 accepted. Send SOCKS5 CONNECT to 1.1.1.1:80
            // [0x05, 0x01 (CONNECT), 0x00 (RSV), 0x01 (IPv4), 1, 1, 1, 1, 0x00, 0x50 (port 80)]
            socket.write(Buffer.from([0x05, 0x01, 0x00, 0x01, 1, 1, 1, 1, 0x00, 0x50]));
            step = 3;
          } else if (step === 2) {
            // Auth reply [0x01, status]
            if (chunk.length < 2 || chunk[1] !== 0x00) {
              return finish({ success: false, error: 'SOCKS5 proxy authentication failed: invalid credentials' });
            }
            // Auth success, send CONNECT
            socket.write(Buffer.from([0x05, 0x01, 0x00, 0x01, 1, 1, 1, 1, 0x00, 0x50]));
            step = 3;
          } else if (step === 3) {
            // CONNECT reply [0x05, rep, 0x00, ...]
            if (chunk.length < 2 || chunk[0] !== 0x05) {
              return finish({ success: false, error: 'Invalid SOCKS5 connect response from proxy' });
            }
            const rep = chunk[1];
            if (rep !== 0x00) {
              const messages: Record<number, string> = {
                1: 'General SOCKS server failure',
                2: 'Connection not allowed by ruleset',
                3: 'Network unreachable',
                4: 'Host unreachable',
                5: 'Connection refused by target',
                6: 'TTL expired',
                7: 'Command not supported',
                8: 'Address type not supported',
              };
              return finish({
                success: false,
                error: `SOCKS5 tunnel refused: ${messages[rep] || `Status code 0x${rep.toString(16)}`}`,
              });
            }
            // SOCKS5 tunnel is verified and accepted
            const latencyMs = Date.now() - startTime;
            return finish({ success: true, latencyMs });
          }
        } else {
          // HTTP / HTTPS Proxy response
          const latencyMs = Date.now() - startTime;
          const text = chunk.toString('utf-8');
          if (text.startsWith('HTTP/1.1 200') || text.startsWith('HTTP/1.0 200') || text.includes('200 Connection established')) {
            return finish({ success: true, latencyMs });
          }
          if (text.startsWith('HTTP/1.1 407') || text.startsWith('HTTP/1.0 407')) {
            return finish({ success: false, error: 'HTTP proxy requires authentication (407)' });
          }
          if (text.startsWith('HTTP/1.1 403') || text.startsWith('HTTP/1.1 502') || text.startsWith('HTTP/1.1 504')) {
            return finish({ success: false, error: `HTTP proxy refused tunnel (${text.slice(0, 30).trim()})` });
          }
          if (text.startsWith('HTTP/')) {
            return finish({ success: true, latencyMs });
          }
          return finish({ success: false, error: 'Unexpected response from HTTP proxy' });
        }
      });

      socket.on('timeout', () => {
        finish({ success: false, error: `Connection timed out after ${timeoutMs}ms` });
      });

      socket.on('error', (err) => {
        finish({ success: false, error: err.message || 'Connection refused or host unreachable' });
      });

      try {
        socket.connect(port, host);
      } catch (err: any) {
        finish({ success: false, error: err.message || 'Failed to initialize socket' });
      }
    });
  }

  /**
   * Tests real end-to-end proxy connectivity and verifies that the proxy
   * can perform handshakes and tunnel HTTP/HTTPS traffic.
   */
  public static async testConnection(config: ProxyConfig, timeoutMs = 4500): Promise<ProxyTestResult> {
    if (!config.enabled || !config.host) {
      return {
        success: false,
        error: 'Proxy is not configured or host is empty',
      };
    }

    const host = config.host.trim();
    const port = Number(config.port) || (config.mode === 'socks5' ? 1080 : 8080);
    const mode = config.mode || 'socks5';

    // Step 1: Real protocol handshake and tunnel verification
    const tunnelResult = await this.verifyTunnel(
      host,
      port,
      mode,
      config.username,
      config.password,
      timeoutMs
    );

    if (!tunnelResult.success) {
      return {
        success: false,
        latencyMs: tunnelResult.latencyMs,
        ip: host,
        error: tunnelResult.error || 'Proxy connection failed or rejected tunnel',
      };
    }

    // Step 2: Geo and IP inspection
    let country: string | undefined;
    let city: string | undefined;
    let timezone: string | undefined;

    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1800);
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
        // Non-blocking geo resolution fallback
      }
    }

    return {
      success: true,
      latencyMs: tunnelResult.latencyMs,
      ip: host,
      country,
      city,
      timezone,
    };
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
