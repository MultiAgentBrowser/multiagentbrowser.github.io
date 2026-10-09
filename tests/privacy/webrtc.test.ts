import { describe, it, expect } from 'vitest';
import { WebRTCController } from '../../src/privacy/webrtc/webrtc-controller';

describe('WebRTC Policy Controls & Protection', () => {
  it('generates WebRTC complete kill script for strict mode', () => {
    const killScript = WebRTCController.generateWebRTCKillScript();
    expect(killScript).toContain('RTCPeerConnection');
    expect(killScript).toContain('webkitRTCPeerConnection');
    expect(killScript).toContain('RTCSessionDescription');
    expect(killScript).toContain('RTCIceCandidate');
  });

  it('safely handles mock session policy assignment', () => {
    let assignedPolicy = '';
    const mockSession = {
      setWebRTCIPHandlingPolicy: (policy: string) => {
        assignedPolicy = policy;
      },
    } as any;

    WebRTCController.applyWebRTCPolicy(mockSession, 'disable_non_proxied_udp');
    expect(assignedPolicy).toBe('disable_non_proxied_udp');

    WebRTCController.applyWebRTCPolicy(mockSession, 'default_public_interface_only');
    expect(assignedPolicy).toBe('default_public_interface_only');
  });
});

