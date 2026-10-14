import fs from 'fs';
import path from 'path';

/**
 * Creates an ephemeral unpacked Chromium Manifest V3 extension that automatically supplies
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
    manifest_version: 3,
    version: '1.0.0',
    name: 'Proxy Authentication Provider',
    description: 'Auto-fills HTTP and SOCKS5 proxy credentials for isolated profiles',
    permissions: [
      'webRequest',
      'webRequestAuthProvider',
    ],
    host_permissions: [
      '<all_urls>',
    ],
    background: {
      service_worker: 'background.js',
    },
  };

  const backgroundScript = `// Ephemeral proxy authenticator (Manifest V3)
const credentials = {
  authCredentials: {
    username: ${JSON.stringify(username)},
    password: ${JSON.stringify(password)}
  }
};

chrome.webRequest.onAuthRequired.addListener(
  function(details, callback) {
    if (typeof callback === 'function') {
      callback(credentials);
    } else {
      return credentials;
    }
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);
`;

  fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  fs.writeFileSync(path.join(targetDir, 'background.js'), backgroundScript, 'utf-8');

  return targetDir;
}
