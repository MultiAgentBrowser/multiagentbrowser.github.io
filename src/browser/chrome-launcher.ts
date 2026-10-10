import fs from 'fs';
import os from 'os';
import path from 'path';

export type SupportedBrowserType = 'chrome' | 'edge' | 'brave' | string;

export interface ResolvedBrowser {
  executablePath: string;
  engine: string;
}

export function getBrowserExecutable(
  browserType: SupportedBrowserType = 'chrome',
  platform: NodeJS.Platform = process.platform,
  homeDirectory = os.homedir(),
  environment: NodeJS.ProcessEnv = process.env
): ResolvedBrowser {
  const normalizedType = (browserType || 'chrome').toLowerCase();
  const candidatesByType: string[] = [];

  if (platform === 'darwin') {
    if (normalizedType === 'brave') {
      candidatesByType.push(
        '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        path.join(homeDirectory, 'Applications/Brave Browser.app/Contents/MacOS/Brave Browser')
      );
    } else if (normalizedType === 'edge') {
      candidatesByType.push(
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        path.join(homeDirectory, 'Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge')
      );
    } else {
      candidatesByType.push(
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        path.join(homeDirectory, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
      );
    }

    // Fallbacks for Darwin: check Chromium and other Chromium engines if specific one is not installed
    candidatesByType.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      path.join(homeDirectory, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      path.join(homeDirectory, 'Applications/Chromium.app/Contents/MacOS/Chromium'),
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      path.join(homeDirectory, 'Library/Application Support/Incogniton/browser/152/mac/IncognitonBrowser.app/Contents/MacOS/IncognitonBrowser')
    );
  } else if (platform === 'win32') {
    const progFiles = environment.PROGRAMFILES;
    const progFilesX86 = environment['PROGRAMFILES(X86)'];
    const localAppData = environment.LOCALAPPDATA;

    if (normalizedType === 'brave') {
      if (progFiles) candidatesByType.push(path.join(progFiles, 'BraveSoftware/Brave-Browser/Application/brave.exe'));
      if (progFilesX86) candidatesByType.push(path.join(progFilesX86, 'BraveSoftware/Brave-Browser/Application/brave.exe'));
      if (localAppData) candidatesByType.push(path.join(localAppData, 'BraveSoftware/Brave-Browser/Application/brave.exe'));
    } else if (normalizedType === 'edge') {
      if (progFilesX86) candidatesByType.push(path.join(progFilesX86, 'Microsoft/Edge/Application/msedge.exe'));
      if (progFiles) candidatesByType.push(path.join(progFiles, 'Microsoft/Edge/Application/msedge.exe'));
    } else {
      if (progFiles) candidatesByType.push(path.join(progFiles, 'Google/Chrome/Application/chrome.exe'));
      if (progFilesX86) candidatesByType.push(path.join(progFilesX86, 'Google/Chrome/Application/chrome.exe'));
      if (localAppData) candidatesByType.push(path.join(localAppData, 'Google/Chrome/Application/chrome.exe'));
    }

    // Windows fallback candidates
    if (progFiles) candidatesByType.push(path.join(progFiles, 'Google/Chrome/Application/chrome.exe'));
    if (progFilesX86) candidatesByType.push(path.join(progFilesX86, 'Google/Chrome/Application/chrome.exe'));
    if (progFilesX86) candidatesByType.push(path.join(progFilesX86, 'Microsoft/Edge/Application/msedge.exe'));
    if (localAppData) candidatesByType.push(path.join(localAppData, 'Google/Chrome/Application/chrome.exe'));
  } else if (platform === 'linux') {
    if (normalizedType === 'brave') {
      candidatesByType.push('/usr/bin/brave-browser', '/opt/brave.com/brave/brave-browser');
    } else if (normalizedType === 'edge') {
      candidatesByType.push('/usr/bin/microsoft-edge', '/opt/microsoft/msedge/msedge');
    } else {
      candidatesByType.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable');
    }

    candidatesByType.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/brave-browser',
      '/usr/bin/microsoft-edge',
      '/opt/google/chrome/chrome',
      path.join(homeDirectory, '.local/bin/google-chrome')
    );
  } else {
    throw new Error(`Chromium browsers are not supported on platform: ${platform}`);
  }

  // Deduplicate candidate paths
  const uniqueCandidates = Array.from(new Set(candidatesByType.filter(Boolean)));
  const found = uniqueCandidates.find((candidate) => fs.existsSync(candidate));

  if (!found) {
    throw new Error(
      `No compatible Chromium browser found on this system for "${normalizedType}". Please install Google Chrome, Brave, or Microsoft Edge.`
    );
  }

  let engine = 'chrome';
  if (found.toLowerCase().includes('brave')) engine = 'brave';
  else if (found.toLowerCase().includes('edge') || found.toLowerCase().includes('msedge')) engine = 'edge';
  else if (found.toLowerCase().includes('incogniton')) engine = 'incogniton-chromium';
  else if (found.toLowerCase().includes('chromium')) engine = 'chromium';

  return { executablePath: found, engine };
}

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
