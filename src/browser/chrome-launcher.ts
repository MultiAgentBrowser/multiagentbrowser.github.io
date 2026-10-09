import fs from 'fs';
import os from 'os';
import path from 'path';

export function getChromeExecutable(
  platform: NodeJS.Platform = process.platform,
  homeDirectory = os.homedir(),
  environment: NodeJS.ProcessEnv = process.env
): string {
  let candidates: string[];

  if (platform === 'darwin') {
    candidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      path.join(homeDirectory, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    ];
  } else if (platform === 'win32') {
    candidates = [
      environment.PROGRAMFILES && path.join(environment.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
      environment['PROGRAMFILES(X86)'] && path.join(environment['PROGRAMFILES(X86)'], 'Google/Chrome/Application/chrome.exe'),
      environment.LOCALAPPDATA && path.join(environment.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    ].filter((candidate): candidate is string => Boolean(candidate));
  } else if (platform === 'linux') {
    candidates = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/opt/google/chrome/chrome',
      path.join(homeDirectory, '.local/bin/google-chrome'),
    ];
  } else {
    throw new Error(`Google Chrome is not supported on ${platform}`);
  }

  return resolveChromeExecutable(candidates);
}

export function resolveChromeExecutable(candidates: string[]): string {
  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable) {
    throw new Error('Google Chrome was not found. Install Google Chrome and try again.');
  }
  return executable;
}
