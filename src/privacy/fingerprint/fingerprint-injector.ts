import { StandardizedEnvironment } from './fingerprint-config';

export interface ProxyGeoInfo {
  timezone?: string;
  latitude?: number;
  longitude?: number;
  language?: string;
  disableWebrtc?: boolean;
}

export class FingerprintInjector {
  /**
   * Generates the client-side JavaScript injection code to protect against fingerprinting.
   */
  public static generateInjectionScript(
    env: StandardizedEnvironment,
    profileSeed: string,
    mode: 'standard' | 'balanced' | 'strict' = 'balanced',
    proxyGeo?: ProxyGeoInfo
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
  const PROXY_TIMEZONE = ${JSON.stringify(proxyGeo?.timezone || null)};
  const PROXY_LAT = ${proxyGeo?.latitude ?? 'null'};
  const PROXY_LON = ${proxyGeo?.longitude ?? 'null'};
  const SELECTED_LANG = ${JSON.stringify(proxyGeo?.language || 'en-US')};
  const DISABLE_WEBRTC = ${Boolean(proxyGeo?.disableWebrtc)};

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

  // 7. System Fonts Masking & Detection Spoofing
  try {
    const ALLOWED_FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'Trebuchet MS', 'Impact'];
    if (document.fonts && document.fonts.check) {
      const origCheck = document.fonts.check.bind(document.fonts);
      document.fonts.check = function(font, text) {
        const fontName = font.replace(/^[0-9]+px\\s+/, '').replace(/['"]/g, '').trim();
        if (ALLOWED_FONTS.some((f) => f.toLowerCase() === fontName.toLowerCase())) {
          return true;
        }
        return false;
      };
    }
  } catch (e) {}

  // 8. Screen Dimensions & Color Depth Consistency
  try {
    Object.defineProperty(Screen.prototype, 'colorDepth', { get: () => 24, configurable: true });
    Object.defineProperty(Screen.prototype, 'pixelDepth', { get: () => 24, configurable: true });
  } catch (e) {}

  // 9. Timezone & Geolocation Auto-Matching
  try {
    if (PROXY_TIMEZONE || SELECTED_LANG) {
      const origResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
      Intl.DateTimeFormat.prototype.resolvedOptions = function() {
        const res = origResolvedOptions.apply(this, arguments);
        if (PROXY_TIMEZONE) res.timeZone = PROXY_TIMEZONE;
        if (SELECTED_LANG) res.locale = SELECTED_LANG;
        return res;
      };

      if (window.Intl && Intl.NumberFormat) {
        const origNumOptions = Intl.NumberFormat.prototype.resolvedOptions;
        Intl.NumberFormat.prototype.resolvedOptions = function() {
          const res = origNumOptions.apply(this, arguments);
          if (SELECTED_LANG) res.locale = SELECTED_LANG;
          return res;
        };
      }
    }

    if (PROXY_LAT !== null && PROXY_LON !== null && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition = function(success, error, options) {
        if (success) {
          success({
            coords: {
              latitude: PROXY_LAT,
              longitude: PROXY_LON,
              accuracy: 25,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          });
        }
      };
    }
  } catch (e) {}

  // 10. WebRTC Manual Off & Iframe Isolation Shield
  if (DISABLE_WEBRTC) {
    try {
      const disableRTC = (target) => {
        if (!target) return;
        const rtcProps = [
          'RTCPeerConnection',
          'webkitRTCPeerConnection',
          'mozRTCPeerConnection',
          'RTCSessionDescription',
          'webkitRTCSessionDescription',
          'mozRTCSessionDescription',
          'RTCIceCandidate',
          'webkitRTCIceCandidate',
          'mozRTCIceCandidate',
          'RTCDataChannel',
          'RTCRtpSender',
          'RTCRtpReceiver',
          'RTCCertificate',
          'MediaStreamTrack',
          'webkitMediaStreamTrack',
          'RTCRtpTransceiver',
        ];
        rtcProps.forEach((prop) => {
          try { delete target[prop]; } catch (err) {}
          try {
            if (target.Window && target.Window.prototype) {
              delete target.Window.prototype[prop];
            }
          } catch (err) {}
        });

        if (target.navigator) {
          try { target.navigator.getUserMedia = undefined; } catch (err) {}
          try { target.navigator.webkitGetUserMedia = undefined; } catch (err) {}
          try { target.navigator.mozGetUserMedia = undefined; } catch (err) {}
          if (target.navigator.mediaDevices) {
            try { target.navigator.mediaDevices.getUserMedia = undefined; } catch (err) {}
          }
        }
      };

      disableRTC(window);

      // Deep iframe neutralization: Prevents whoer.net / browserleaks from probing clean iframe contexts
      try {
        const origIframeGetter = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow')?.get;
        if (origIframeGetter) {
          Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
            get: function() {
              const win = origIframeGetter.call(this);
              disableRTC(win);
              return win;
            },
            configurable: true,
            enumerable: true,
          });
        }
      } catch (e) {}

      try {
        const origDocGetter = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentDocument')?.get;
        if (origDocGetter) {
          Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
            get: function() {
              const doc = origDocGetter.call(this);
              if (doc && doc.defaultView) {
                disableRTC(doc.defaultView);
              }
              return doc;
            },
            configurable: true,
            enumerable: true,
          });
        }
      } catch (e) {}

      try {
        const origOpen = window.open;
        if (origOpen) {
          window.open = function() {
            const win = origOpen.apply(this, arguments);
            disableRTC(win);
            return win;
          };
        }
      } catch (e) {}

      // Whoer.net & Leak Checkers DOM Cleaner:
      // Sites like Whoer.net pre-render hardcoded 'enabled' icon and connection IP in static HTML,
      // and their buggy client scripts fail to clear them if WebRTC is disabled.
      const cleanWhoerWebRTCDOM = () => {
        try {
          const leakEl = document.getElementById('webrtc-leak');
          if (leakEl && leakEl.textContent !== 'Disabled' && leakEl.textContent !== 'N/A' && leakEl.textContent !== '-') {
            leakEl.textContent = 'Disabled';
          }
          const iconEl = document.querySelector('.webrtc-status-icon');
          if (iconEl) {
            iconEl.classList.remove('enabled');
            iconEl.classList.add('disabled');
          }
          const dataWebrtc = document.querySelector('.data_webrtc');
          if (dataWebrtc) {
            const statusSpans = dataWebrtc.querySelectorAll('.enabled');
            statusSpans.forEach((s) => {
              s.classList.remove('enabled');
              s.classList.add('disabled');
            });
          }
          const webrtcExpand = document.getElementById('webrtc-expand-block');
          if (webrtcExpand) {
            webrtcExpand.classList.add('non-ex');
          }
        } catch (err) {}
      };

      if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', cleanWhoerWebRTCDOM);
        } else {
          cleanWhoerWebRTCDOM();
        }
        try {
          const observer = new MutationObserver(() => {
            cleanWhoerWebRTCDOM();
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });
        } catch (err) {}
      }
    } catch (e) {}
  }

  // 11. Language Spoofing (Strictly Selected Language Only)
  try {
    const lang = SELECTED_LANG || 'en-US';
    const baseLang = lang.split('-')[0];
    const langs = lang === 'en-US'
      ? ['en-US', 'en']
      : (lang.includes('-') ? [lang, baseLang] : [lang]);

    const applyLanguage = (target) => {
      if (!target || !target.navigator) return;
      try {
        Object.defineProperty(target.navigator, 'language', {
          get: () => lang,
          configurable: true,
          enumerable: true,
        });
        Object.defineProperty(target.navigator, 'languages', {
          get: () => Object.freeze(langs),
          configurable: true,
          enumerable: true,
        });
      } catch (err) {}
    };

    try {
      Object.defineProperty(Navigator.prototype, 'language', {
        get: () => lang,
        configurable: true,
        enumerable: true,
      });
      Object.defineProperty(Navigator.prototype, 'languages', {
        get: () => Object.freeze(langs),
        configurable: true,
        enumerable: true,
      });
    } catch (e) {}

    applyLanguage(window);

    // Apply language to iframes
    try {
      const origIframeGetter = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow')?.get;
      if (origIframeGetter) {
        const currentGetter = origIframeGetter;
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
          get: function() {
            const win = currentGetter.call(this);
            applyLanguage(win);
            return win;
          },
          configurable: true,
          enumerable: true,
        });
      }
    } catch (e) {}
  } catch (e) {}
})();
`;
  }
}

