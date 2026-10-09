import os from 'os';

export interface PlatformInfo {
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
  arch: string;
  isAppleSilicon: boolean;
  isWindowsARM64: boolean;
  osVersion: string;
}

export function getPlatformInfo(): PlatformInfo {
  const platform = process.platform;
  const arch = process.arch;

  return {
    isMac: platform === 'darwin',
    isWindows: platform === 'win32',
    isLinux: platform === 'linux',
    arch,
    isAppleSilicon: platform === 'darwin' && arch === 'arm64',
    isWindowsARM64: platform === 'win32' && arch === 'arm64',
    osVersion: os.release(),
  };
}

