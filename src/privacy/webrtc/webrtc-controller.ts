import { Session } from 'electron';
import { WebRTCPolicy } from '../../security/ipc-contracts';

export class WebRTCController {
  /**
   * Applies the WebRTC IP handling policy to an Electron partition session.
   * - default: Standard Chromium behavior (may leak private LAN IPs in ICE candidates).
   * - default_public_interface_only: Prevents private/LAN IP leaks.
   * - disable_non_proxied_udp: Strict UDP leak prevention (forces proxied TCP or disables non-proxied UDP).
   */
  public static applyWebRTCPolicy(targetSession: Session, policy: WebRTCPolicy): void {
    try {
      (targetSession as any).setWebRTCIPHandlingPolicy?.(policy);
    } catch (err) {
      console.error(`Failed to set WebRTC IP handling policy to ${policy}:`, err);
    }
  }

  /**
   * Generates a client-side script snippet to completely disable RTCPeerConnection if requested.
   */
  public static generateWebRTCKillScript(): string {
    return `
(() => {
  try {
    delete window.RTCPeerConnection;
    delete window.webkitRTCPeerConnection;
    delete window.RTCSessionDescription;
    delete window.RTCIceCandidate;
    Object.defineProperty(window, 'RTCPeerConnection', {
      get: () => undefined,
      set: () => {},
      configurable: false
    });
  } catch (e) {}
})();
`;
  }
}
