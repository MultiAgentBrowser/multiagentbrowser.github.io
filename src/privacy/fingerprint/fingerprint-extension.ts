import fs from 'fs';
import path from 'path';
import { FingerprintConfig } from './fingerprint-config';
import { FingerprintInjector, ProxyGeoInfo } from './fingerprint-injector';
import { getProfileFingerprintSeed } from './profile-fingerprint';
import { BlocklistStore } from '../tracker/blocklist-store';

export function createFingerprintProtectionExtension(
  targetDir: string,
  profileId: string,
  os: 'mac' | 'windows',
  mode: 'standard' | 'balanced' | 'strict',
  proxyGeo?: ProxyGeoInfo
): string {
  fs.mkdirSync(targetDir, { recursive: true });

  const manifest = {
    manifest_version: 3,
    name: 'Privacy Browser Fingerprint Protection',
    version: '1.0.0',
    description: 'Blocks known tracking domains and applies fingerprint protections.',
    permissions: ['declarativeNetRequest', 'privacy'],
    host_permissions: ['<all_urls>'],
    background: {
      service_worker: 'background.js',
    },
    declarative_net_request: {
      rule_resources: [{
        id: 'known_trackers',
        enabled: true,
        path: 'rules.json',
      }],
    },
    content_scripts: [{
      matches: ['<all_urls>'],
      js: ['fingerprint.js'],
      run_at: 'document_start',
      all_frames: true,
      match_about_blank: true,
      world: 'MAIN',
    }],
  };
  const rules = Array.from(BlocklistStore.getDomains())
    .sort()
    .map((domain, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: `||${domain}^`,
        excludedResourceTypes: ['main_frame'],
      },
    }));

  if (proxyGeo?.language) {
    const lang = proxyGeo.language;
    const baseLang = lang.split('-')[0];
    const acceptHeaderVal = lang === 'en-US'
      ? 'en-US,en;q=0.9'
      : (lang.includes('-') ? `${lang},${baseLang};q=0.9` : `${lang};q=0.9`);

    rules.push({
      id: rules.length + 1,
      priority: 100,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: 'accept-language',
            operation: 'set',
            value: acceptHeaderVal,
          },
        ],
      },
      condition: {
        urlFilter: '|http',
        resourceTypes: [
          'main_frame',
          'sub_frame',
          'stylesheet',
          'script',
          'image',
          'font',
          'object',
          'xmlhttprequest',
          'ping',
          'csp_report',
          'media',
          'websocket',
          'other',
        ],
      },
    } as any);
  }

  const backgroundScript = `
if (chrome.privacy?.websites?.thirdPartyCookiesAllowed) {
  chrome.privacy.websites.thirdPartyCookiesAllowed.set(
    { value: false, scope: 'regular' },
    () => {
      if (chrome.runtime.lastError) {
        console.warn('Could not disable third-party cookies:', chrome.runtime.lastError.message);
      }
    }
  );
}

if (chrome.privacy?.network?.webRTCIPHandlingPolicy) {
  chrome.privacy.network.webRTCIPHandlingPolicy.set(
    { value: 'disable_non_proxied_udp', scope: 'regular' },
    () => {
      if (chrome.runtime.lastError) {
        console.warn('Could not set webRTCIPHandlingPolicy:', chrome.runtime.lastError.message);
      }
    }
  );
}
`;
  const script = FingerprintInjector.generateInjectionScript(
    FingerprintConfig.getConsistentEnvironment(os === 'mac'),
    getProfileFingerprintSeed(profileId),
    mode,
    proxyGeo
  );

  fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  fs.writeFileSync(path.join(targetDir, 'rules.json'), JSON.stringify(rules, null, 2), 'utf-8');
  fs.writeFileSync(path.join(targetDir, 'background.js'), backgroundScript, 'utf-8');
  fs.writeFileSync(path.join(targetDir, 'fingerprint.js'), script, 'utf-8');
  return targetDir;
}
