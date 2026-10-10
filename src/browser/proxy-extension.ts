import fs from 'fs';
import path from 'path';

/**
 * Creates an ephemeral unpacked Chromium extension that automatically supplies
 * proxy credentials (username & password) to chrome.webRequest.onAuthRequired,
 * allowing full proxy authentication without requiring user intervention.
 */
export function createProxyAuthExtension(
  targetDir: string,
  username: string,
  password: string
): string {
  fs.mkdirSync(targetDir, { recursive: true });

  const manifest = {
    version: '1.0.0',
    manifest_version: 2,
    name: 'Proxy Authentication Provider',
    description: 'Auto-fills HTTP and SOCKS5 proxy credentials for isolated profiles',
    permissions: [
      'proxy',
      'tabs',
      'unlimitedStorage',
      'storage',
      '<all_urls>',
      'webRequest',
      'webRequestBlocking',
    ],
    background: {
      scripts: ['background.js'],
      persistent: true,
    },
  };

  const backgroundScript = `// Ephemeral proxy authenticator
chrome.webRequest.onAuthRequired.addListener(
  function(details) {
    return {
      authCredentials: {
        username: ${JSON.stringify(username)},
        password: ${JSON.stringify(password)}
      }
    };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);
`;

  fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  fs.writeFileSync(path.join(targetDir, 'background.js'), backgroundScript, 'utf-8');

  return targetDir;
}

