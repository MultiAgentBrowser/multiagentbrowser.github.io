import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getChromeExecutable, resolveChromeExecutable } from '../../src/browser/chrome-launcher';

describe('Google Chrome resolution', () => {
  let tempRoot: string | undefined;

  afterEach(() => {
    vi.restoreAllMocks();
    if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  });

  it('resolves the installed Chrome application for macOS', () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-test-'));
    const executable = path.join(tempRoot, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    fs.mkdirSync(path.dirname(executable), { recursive: true });
    fs.writeFileSync(executable, '');
    vi.spyOn(fs, 'existsSync').mockImplementation((candidate) => candidate.toString() === executable);

    expect(getChromeExecutable('darwin', tempRoot, {})).toBe(executable);
  });

  it('reports a clear error when Chrome is missing instead of falling back to a test browser', () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-test-'));

    expect(() => resolveChromeExecutable([path.join(tempRoot, 'missing-chrome')]))
      .toThrow('Google Chrome was not found. Install Google Chrome and try again.');
  });
});
