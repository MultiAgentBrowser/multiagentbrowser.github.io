import { webFrame } from 'electron';

const fingerprintSeed = process.argv
  .find((argument) => argument.startsWith('--profile-fingerprint-seed='))
  ?.slice('--profile-fingerprint-seed='.length)
  .match(/^[a-f0-9]{64}$/)?.[0] ?? 'default-profile-fingerprint-seed';

const isMac = process.platform === 'darwin';
const env = isMac
  ? {
      hardwareConcurrency: 8,
      deviceMemory: 8,
      colorDepth: 24,
      pixelDepth: 24,
      webglVendor: 'Google Inc. (Apple)',
      webglRenderer: 'ANGLE (Apple, Apple M-Series, OpenGL 4.1 Metal - 88)',
    }
  : {
      hardwareConcurrency: 8,
      deviceMemory: 8,
      colorDepth: 24,
      pixelDepth: 24,
      webglVendor: 'Google Inc. (NVIDIA)',
      webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX Direct3D11 vs_5_0 ps_5_0)',
    };

const script = `
(() => {
  if (window.__pb_fingerprint_shield_installed) return;
  window.__pb_fingerprint_shield_installed = true;

  const HARDWARE_CONCURRENCY = ${env.hardwareConcurrency};
  const DEVICE_MEMORY = ${env.deviceMemory};
  const VENDOR_WEBGL = ${JSON.stringify(env.webglVendor)};
  const RENDERER_WEBGL = ${JSON.stringify(env.webglRenderer)};
  const PROFILE_SEED = ${JSON.stringify(fingerprintSeed)};

  // Seeded values stay stable within a profile, but differ between profiles.
  const hashString = (value) => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    }
    return hash >>> 0;
  };
  const profileHash = hashString(PROFILE_SEED);
  const getNoise = (x, y) => {
    let hash = (profileHash ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    return (hash & 1) ? 1 : -1;
  };
  const getStableId = (kind, index) =>
    'pb-' + hashString(PROFILE_SEED + ':' + kind + ':' + index).toString(36);

  // 1. Hardware Concurrency & Device Memory Normalization
  try {
    Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
      get: () => HARDWARE_CONCURRENCY,
      configurable: true,
      enumerable: true,
    });

    if ('deviceMemory' in Navigator.prototype) {
      Object.defineProperty(Navigator.prototype, 'deviceMemory', {
        get: () => DEVICE_MEMORY,
        configurable: true,
        enumerable: true,
      });
    }
  } catch (e) {}

  // 2. Battery Status API Protection
  try {
    if (typeof navigator.getBattery === 'function') {
      const mockBattery = {
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1.0,
        onchargingchange: null,
        onchargingtimechange: null,
        ondischargingtimechange: null,
        onlevelchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
      Navigator.prototype.getBattery = () => Promise.resolve(mockBattery);
    }
  } catch (e) {}

  // 3. WebGL Unmasked Vendor & Renderer Normalization
  try {
    const UNMASKED_VENDOR_WEBGL = 0x9245;
    const UNMASKED_RENDERER_WEBGL = 0x9246;

    const patchWebGL = (proto) => {
      if (!proto || !proto.getParameter) return;
      const originalGetParameter = proto.getParameter;
      proto.getParameter = function(param) {
        if (param === UNMASKED_VENDOR_WEBGL) {
          return VENDOR_WEBGL;
        }
        if (param === UNMASKED_RENDERER_WEBGL) {
          return RENDERER_WEBGL;
        }
        return originalGetParameter.apply(this, arguments);
      };
    };

    if (window.WebGLRenderingContext) patchWebGL(WebGLRenderingContext.prototype);
    if (window.WebGL2RenderingContext) patchWebGL(WebGL2RenderingContext.prototype);
  } catch (e) {}

  // 4. Stable Deterministic Canvas Normalization
  try {
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
      const imageData = originalGetImageData.apply(this, arguments);
      const data = imageData.data;
      const len = data.length;
      for (let i = 0; i < len; i += 16) {
        data[i] = Math.min(255, Math.max(0, data[i] + getNoise(i, len)));
      }
      return imageData;
    };
  } catch (e) {}

  // 5. WebAudio Oscillator Fingerprint Normalization
  try {
    if (window.AudioBuffer) {
      const originalGetChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function(channel) {
        const floatData = originalGetChannelData.apply(this, arguments);
        const len = floatData.length;
        for (let i = 0; i < len; i += 64) {
          floatData[i] = floatData[i] + getNoise(i, channel) * 0.0000001;
        }
        return floatData;
      };
    }
  } catch (e) {}

  // 6. Media Device Enumeration Protection
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
      navigator.mediaDevices.enumerateDevices = async function() {
        const devices = await originalEnumerateDevices.apply(this, arguments);
        return devices.map((d, index) => {
          const maskedDevice = {
            deviceId: d.deviceId ? getStableId(d.kind, index) : '',
            groupId: d.groupId ? getStableId(d.kind + '_group', index) : '',
            kind: d.kind,
            label: d.label ? d.label : '',
          };
          return { ...maskedDevice, toJSON: () => ({ ...maskedDevice }) };
        });
      };
    }
  } catch (e) {}
})();
true;
`;

const injectViaDOM = () => {
  const container = document.head || document.documentElement;
  if (!container) return false;

  const element = document.createElement('script');
  element.textContent = script;
  container.appendChild(element);
  element.remove();
  return true;
};

const injectFingerprintShield = () => {
  try {
    // executeJavaScript returns a Promise, so handle failures that happen after
    // the synchronous call (for example, while the frame is changing documents).
    void webFrame.executeJavaScriptInIsolatedWorld(0, [{ code: script }])
      .then((executed) => {
        if (executed !== true && !injectViaDOM()) {
          document.addEventListener('DOMContentLoaded', injectViaDOM, { once: true });
        }
      })
      .catch(() => {
        if (!injectViaDOM()) {
          document.addEventListener('DOMContentLoaded', injectViaDOM, { once: true });
        }
      });
  } catch {
    if (!injectViaDOM()) {
      document.addEventListener('DOMContentLoaded', injectViaDOM, { once: true });
    }
  }
};

injectFingerprintShield();
