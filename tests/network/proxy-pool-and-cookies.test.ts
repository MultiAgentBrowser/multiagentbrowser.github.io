import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SavedProxyStorage } from '../../src/network/proxy/saved-proxy-storage';
import { ProxyTester } from '../../src/network/proxy/proxy-tester';
import { CookieManager } from '../../src/privacy/cookies/cookie-manager';
import { AppPaths } from '../../src/platform/paths';

describe('Phase 1 & Phase 3: Proxy Pool, Rotation and Cookie Manager', () => {
  const testProxy = {
    id: 'test-proxy-1',
    name: 'Test US Proxy',
    mode: 'socks5' as const,
    host: '127.0.0.1',
    port: 1080,
    changeIpUrl: 'http://127.0.0.1:9999/rotate',
    group: 'Default',
    createdAt: Date.now(),
  };

  afterEach(() => {
    SavedProxyStorage.delete(testProxy.id);
  });

  it('saves, retrieves, and deletes proxies in SavedProxyStorage', () => {
    SavedProxyStorage.save(testProxy);
    const list = SavedProxyStorage.list();
    const found = list.find((p) => p.id === testProxy.id);
    expect(found).toBeDefined();
    expect(found?.host).toBe('127.0.0.1');
    expect(found?.port).toBe(1080);
    expect(found?.changeIpUrl).toBe('http://127.0.0.1:9999/rotate');

    const deleted = SavedProxyStorage.delete(testProxy.id);
    expect(deleted).toBe(true);
    const updatedList = SavedProxyStorage.list();
    expect(updatedList.find((p) => p.id === testProxy.id)).toBeUndefined();
  });

  it('rejects invalid rotation URLs in ProxyTester.rotateProxyIp', async () => {
    const res = await ProxyTester.rotateProxyIp('invalid-url');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Must start with http:// or https://');
  });

  it('fails gracefully when rotation endpoint is unreachable', async () => {
    const res = await ProxyTester.rotateProxyIp('http://127.0.0.1:54321/change-ip');
    expect(res.success).toBe(false);
  });
});

