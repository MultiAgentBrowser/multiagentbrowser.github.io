import http from 'http';
import net from 'net';
import { ProxyConfig } from '../../security/ipc-contracts';

/**
 * In-process transparent local proxy bridge.
 * 
 * When a profile uses an authenticated proxy (username & password),
 * launching Chrome directly against the remote proxy causes Chrome to show a native
 * "Sign in: Proxy requires username and password" dialog or fail (especially on SOCKS5).
 * 
 * ProxyBridge creates an ephemeral, zero-overhead local HTTP proxy on 127.0.0.1:<random_port>.
 * Chrome connects directly to this local bridge without any auth challenge.
 * The bridge transparently attaches the credentials and establishes HTTP CONNECT or SOCKS5 tunnels
 * to the remote proxy server, guaranteeing 100% silent, instantaneous proxy authentication.
 */
export class ProxyBridge {
  private static activeBridges = new Map<string, http.Server>();

  /**
   * Starts a local proxy bridge for a profile, returning the local port.
   */
  public static async startBridge(profileId: string, proxy: ProxyConfig): Promise<number> {
    this.stopBridge(profileId);

    const remoteHost = proxy.host.trim();
    const remotePort = Number(proxy.port) || 8080;
    const isSocks = proxy.mode === 'socks5';
    const username = proxy.username?.trim();
    const password = proxy.password?.trim();

    const authHeader = (username && password)
      ? `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
      : undefined;

    const server = http.createServer((req, res) => {
      if (!isSocks) {
        const headers = { ...req.headers };
        if (authHeader) {
          headers['Proxy-Authorization'] = authHeader;
        }
        const options: http.RequestOptions = {
          host: remoteHost,
          port: remotePort,
          path: req.url,
          method: req.method,
          headers,
        };
        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res);
        });
        proxyReq.on('error', () => {
          if (!res.headersSent) res.writeHead(502);
          res.end();
        });
        req.pipe(proxyReq);
      } else {
        res.writeHead(501);
        res.end('Use CONNECT for SOCKS5');
      }
    });

    server.on('connect', (req, clientSocket, head) => {
      const targetUrl = req.url;
      if (!targetUrl) {
        clientSocket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        return;
      }

      if (isSocks) {
        // Handle SOCKS5 with RFC 1928 / RFC 1929 authentication
        const remoteSocket = net.connect(remotePort, remoteHost, () => {
          if (username && password) {
            remoteSocket.write(Buffer.from([0x05, 0x02, 0x00, 0x02]));
          } else {
            remoteSocket.write(Buffer.from([0x05, 0x01, 0x00]));
          }
        });

        let step = 1;
        const sendSocksConnect = () => {
          const [tHost, tPortStr] = targetUrl.split(':');
          const tPort = parseInt(tPortStr || '443', 10);
          const dBuf = Buffer.from(tHost);
          const pBuf = Buffer.alloc(2);
          pBuf.writeUInt16BE(tPort, 0);
          remoteSocket.write(Buffer.concat([
            Buffer.from([0x05, 0x01, 0x00, 0x03, dBuf.length]),
            dBuf,
            pBuf,
          ]));
          step = 3;
        };

        remoteSocket.on('data', (chunk) => {
          if (step === 1) {
            if (chunk[1] === 0x02 && username && password) {
              const uBuf = Buffer.from(username);
              const pBuf = Buffer.from(password);
              remoteSocket.write(Buffer.concat([
                Buffer.from([0x01, uBuf.length]),
                uBuf,
                Buffer.from([pBuf.length]),
                pBuf,
              ]));
              step = 2;
              return;
            }
            sendSocksConnect();
          } else if (step === 2) {
            if (chunk[1] === 0x00) {
              sendSocksConnect();
            } else {
              clientSocket.end('HTTP/1.1 502 Proxy Authentication Failed\r\n\r\n');
              remoteSocket.destroy();
            }
          } else if (step === 3) {
            if (chunk[1] === 0x00) {
              step = 4;
              clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
              if (head && head.length) remoteSocket.write(head);
              clientSocket.pipe(remoteSocket);
              remoteSocket.pipe(clientSocket);
            } else {
              clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
              remoteSocket.destroy();
            }
          }
        });

        remoteSocket.on('error', () => clientSocket.destroy());
        clientSocket.on('error', () => remoteSocket.destroy());
      } else {
        // Handle HTTP CONNECT with Proxy-Authorization header
        const remoteSocket = net.connect(remotePort, remoteHost, () => {
          const authPart = authHeader ? `Proxy-Authorization: ${authHeader}\r\n` : '';
          const connectReq = `CONNECT ${targetUrl} HTTP/1.1\r\nHost: ${targetUrl}\r\n${authPart}Proxy-Connection: keep-alive\r\n\r\n`;
          remoteSocket.write(connectReq);
        });

        let connected = false;
        remoteSocket.on('data', (chunk) => {
          if (!connected) {
            const str = chunk.toString();
            if (str.includes('200 OK') || str.includes('200 Connection established')) {
              connected = true;
              clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
              if (head && head.length) remoteSocket.write(head);
              clientSocket.pipe(remoteSocket);
              remoteSocket.pipe(clientSocket);
            } else {
              clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
              remoteSocket.destroy();
            }
          }
        });

        remoteSocket.on('error', () => clientSocket.destroy());
        clientSocket.on('error', () => remoteSocket.destroy());
      }
    });

    return new Promise((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => {
        const port = (server.address() as net.AddressInfo).port;
        this.activeBridges.set(profileId, server);
        resolve(port);
      });
      server.once('error', reject);
    });
  }

  /**
   * Stops the local proxy bridge for a profile.
   */
  public static stopBridge(profileId: string): void {
    const server = this.activeBridges.get(profileId);
    if (server) {
      this.activeBridges.delete(profileId);
      try {
        server.close();
      } catch {}
    }
  }

  /**
   * Stops all active proxy bridges.
   */
  public static stopAll(): void {
    for (const [id, server] of this.activeBridges.entries()) {
      try {
        server.close();
      } catch {}
    }
    this.activeBridges.clear();
  }
}

