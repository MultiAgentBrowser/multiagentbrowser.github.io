import http from 'http';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { AppPaths } from '../platform/paths';

export interface ProfileSessionData {
  cookies: any[];
  openUrls: string[];
  lastUpdated: number;
}

export class SessionSyncServer extends EventEmitter {
  private static instance: SessionSyncServer | null = null;
  private server: http.Server | null = null;
  private port: number = 0;
  private sessions: Map<string, ProfileSessionData> = new Map();

  public static getInstance(): SessionSyncServer {
    if (!this.instance) {
      this.instance = new SessionSyncServer();
    }
    return this.instance;
  }

  public async start(): Promise<number> {
    if (this.server && this.port > 0) {
      return this.port;
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // Enable CORS for Chromium extension requests
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

        if (req.method === 'GET' && url.pathname === '/api/session') {
          const profileId = url.searchParams.get('profileId');
          if (!profileId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing profileId parameter' }));
            return;
          }

          const session = this.getSession(profileId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(session));
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/session') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
            if (body.length > 20 * 1024 * 1024) {
              // 20MB limit
              req.destroy();
            }
          });

          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const { profileId, cookies, openUrls } = data;
              if (!profileId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing profileId' }));
                return;
              }

              this.setSession(
                profileId,
                Array.isArray(cookies) ? cookies : [],
                Array.isArray(openUrls) ? openUrls : []
              );

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, count: cookies?.length || 0 }));
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      // Bind to 127.0.0.1 on random available port
      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server?.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
          resolve(this.port);
        } else {
          reject(new Error('Failed to obtain server address'));
        }
      });
    });
  }

  public getPort(): number {
    return this.port;
  }

  public setSession(profileId: string, cookies: any[], openUrls: string[]): void {
    const sessionData: ProfileSessionData = {
      cookies,
      openUrls,
      lastUpdated: Date.now(),
    };
    this.sessions.set(profileId, sessionData);
    this.saveSessionToDisk(profileId, cookies, openUrls);
    this.emit('session-updated', { profileId, cookies, openUrls });
  }

  public getSession(profileId: string): ProfileSessionData {
    if (!this.sessions.has(profileId)) {
      const fromDisk = this.loadSessionFromDisk(profileId);
      this.sessions.set(profileId, {
        cookies: fromDisk.cookies,
        openUrls: fromDisk.openUrls,
        lastUpdated: Date.now(),
      });
    }
    return this.sessions.get(profileId)!;
  }

  public saveSessionToDisk(profileId: string, cookies: any[], openUrls: string[]): void {
    try {
      const dir = AppPaths.getProfileStorageDir(profileId);
      fs.mkdirSync(dir, { recursive: true });

      const cookiesPath = path.join(dir, 'cookies.json');
      fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2), 'utf-8');

      const sessionPath = path.join(dir, 'session.json');
      fs.writeFileSync(
        sessionPath,
        JSON.stringify({ openUrls, lastExitedAt: Date.now() }, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error(`Failed to save session to disk for profile ${profileId}:`, err);
    }
  }

  public loadSessionFromDisk(profileId: string): { cookies: any[]; openUrls: string[] } {
    try {
      const dir = AppPaths.getProfileStorageDir(profileId);
      const cookiesPath = path.join(dir, 'cookies.json');
      const sessionPath = path.join(dir, 'session.json');

      let cookies: any[] = [];
      let openUrls: string[] = [];

      if (fs.existsSync(cookiesPath)) {
        const raw = fs.readFileSync(cookiesPath, 'utf-8');
        cookies = JSON.parse(raw);
      }

      if (fs.existsSync(sessionPath)) {
        const raw = fs.readFileSync(sessionPath, 'utf-8');
        const parsed = JSON.parse(raw);
        openUrls = Array.isArray(parsed.openUrls) ? parsed.openUrls : [];
      }

      return { cookies, openUrls };
    } catch {
      return { cookies: [], openUrls: [] };
    }
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.port = 0;
    }
  }
}

