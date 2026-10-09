import { webFrame } from 'electron';

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
        data[i] = Math.min(255, Math.max(0, data[i] + 1));
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
          floatData[i] = floatData[i] + 0.0000001;
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
        return devices.map((d, index) => ({
          deviceId: 'default_' + index,
          groupId: 'group_' + index,
          kind: d.kind,
          label: d.label ? d.label : '',
          toJSON: () => ({ ...d }),
        }));
      };
    }
  } catch (e) {}
})();
`;

(() => {

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
