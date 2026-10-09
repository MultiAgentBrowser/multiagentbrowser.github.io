export interface StandardizedEnvironment {
  hardwareConcurrency: number;
  deviceMemory: number;
  colorDepth: number;
  pixelDepth: number;
  webglVendor: string;
  webglRenderer: string;
  batteryStatus: {
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    level: number;
  };
}

export class FingerprintConfig {
  /**
   * Generates a stable, internally consistent normalized configuration.
   * Maintains internal consistency so browser characteristics do not contradict each other.
   */
  public static getConsistentEnvironment(isMac: boolean = true): StandardizedEnvironment {
    if (isMac) {
      return {
        hardwareConcurrency: 8,
        deviceMemory: 8,
        colorDepth: 24,
        pixelDepth: 24,
        webglVendor: 'Google Inc. (Apple)',
        webglRenderer: 'ANGLE (Apple, Apple M-Series, OpenGL 4.1 Metal - 88)',
        batteryStatus: {
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1.0,
        },
      };
    }

    return {
      hardwareConcurrency: 8,
      deviceMemory: 8,
      colorDepth: 24,
      pixelDepth: 24,
      webglVendor: 'Google Inc. (NVIDIA)',
      webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX Direct3D11 vs_5_0 ps_5_0)',
      batteryStatus: {
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1.0,
      },
    };
  }

  /**
   * Simple deterministic Pseudo-Random Number Generator (Murmur-style)
   * used to generate consistent, deterministic noise per profile seed.
   */
  public static createDeterministicNoiseGenerator(seedStr: string): (x: number, y: number) => number {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
      seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    }

    return (x: number, y: number): number => {
      let h = (seed ^ (x * 374761393) ^ (y * 668265263)) >>> 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      // Return subtle deterministic offset (-1, 0, or 1)
      return ((h & 3) - 1);
    };
  }
}

