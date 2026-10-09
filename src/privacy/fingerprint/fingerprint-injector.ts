import { StandardizedEnvironment } from './fingerprint-config';

export class FingerprintInjector {
  /**
   * Generates the client-side JavaScript injection code to protect against fingerprinting.
   */
  public static generateInjectionScript(
    env: StandardizedEnvironment,
    profileSeed: string,
    mode: 'standard' | 'balanced' | 'strict' = 'balanced'
  ): string {
    return `
(() => {
  if (window.__pb_fingerprint_shield_installed) return;
  window.__pb_fingerprint_shield_installed = true;

  const PROFILE_SEED = ${JSON.stringify(profileSeed)};
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

    // Fast deterministic hash for pixel jitter
    const getNoise = (x, y) => {
      let h = (x * 374761393) ^ (y * 668265263);
      for (let i = 0; i < PROFILE_SEED.length; i++) {
        h = (h ^ PROFILE_SEED.charCodeAt(i)) * 1274126177;
      }
      return (h & 1) ? 1 : -1;
    };

    CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
      const imageData = originalGetImageData.apply(this, arguments);
      const data = imageData.data;
      const len = data.length;

      // Apply subtle deterministic offset to alpha and color channels
      for (let i = 0; i < len; i += 16) {
        const offset = getNoise(i, len);
        data[i] = Math.min(255, Math.max(0, data[i] + offset));
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

  // 6. Media Device Enumeration Protection (mask hardware IDs until permission)
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
  }
}

