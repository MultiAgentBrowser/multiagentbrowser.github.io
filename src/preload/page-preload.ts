import { webFrame } from 'electron';
import { FingerprintConfig } from '../privacy/fingerprint/fingerprint-config';
import { FingerprintInjector } from '../privacy/fingerprint/fingerprint-injector';

(() => {
  const isMac = process.platform === 'darwin';
  const env = FingerprintConfig.getConsistentEnvironment(isMac);
  const script = FingerprintInjector.generateInjectionScript(env, 'profile-stable-seed', 'balanced');

  try {
    // Execute inside the main execution world so all page scripts receive normalized prototypes
    webFrame.executeJavaScript(script);
  } catch {
    // Fallback via document script tag if executeJavaScript is deferred
    const injectViaDOM = () => {
      const container = document.head || document.documentElement;
      if (container) {
        const el = document.createElement('script');
        el.textContent = script;
        container.appendChild(el);
        el.remove();
      }
    };

    if (document.documentElement) {
      injectViaDOM();
    } else {
      document.addEventListener('DOMContentLoaded', injectViaDOM, { once: true });
    }
  }
})();
