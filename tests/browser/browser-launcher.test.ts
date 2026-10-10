import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getBrowserExecutable } from '../../src/browser/chrome-launcher';

describe('Multi-browser engine resolution', () => {
  let tempRoot: string | undefined;

  afterEach(() => {
    vi.restoreAllMocks();
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
    tempRoot = undefined;
  });

  it('resolves Brave executable when installed', () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'brave-test-'));
    const bravePath = path.join(tempRoot, 'Applications/Brave Browser.app/Contents/MacOS/Brave Browser');
    fs.mkdirSync(path.dirname(bravePath), { recursive: true });
    fs.writeFileSync(bravePath, '');

    vi.spyOn(fs, 'existsSync').mockImplementation((c) => c.toString() === bravePath);

    const result = getBrowserExecutable('brave', 'darwin', tempRoot, {});
    expect(result.executablePath).toBe(bravePath);
    expect(result.engine).toBe('brave');
  });

  it('resolves Microsoft Edge executable when installed', () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-test-'));
    const edgePath = path.join(tempRoot, 'Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
    fs.mkdirSync(path.dirname(edgePath), { recursive: true });
    fs.writeFileSync(edgePath, '');

    vi.spyOn(fs, 'existsSync').mockImplementation((c) => c.toString() === edgePath);

    const result = getBrowserExecutable('edge', 'darwin', tempRoot, {});
    expect(result.executablePath).toBe(edgePath);
    expect(result.engine).toBe('edge');
  });

  it('falls back to Google Chrome if requested engine is not present but Chrome is installed', () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fallback-test-'));
    const chromePath = path.join(tempRoot, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    fs.mkdirSync(path.dirname(chromePath), { recursive: true });
    fs.writeFileSync(chromePath, '');

    vi.spyOn(fs, 'existsSync').mockImplementation((c) => c.toString() === chromePath);

    const result = getBrowserExecutable('brave', 'darwin', tempRoot, {});
    expect(result.executablePath).toBe(chromePath);
    expect(result.engine).toBe('chrome');
  });
});

