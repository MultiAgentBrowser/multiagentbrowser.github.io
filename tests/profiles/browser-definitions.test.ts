import { describe, expect, it } from 'vitest';
import { getBrowserUserAgent, getEffectiveUserAgent } from '../../src/profiles/browser-definitions';

describe('Profile User-Agent selection', () => {
  it('uses a non-empty custom User-Agent when provided', () => {
    expect(getEffectiveUserAgent('chrome', '131.0.6778.86', 'mac', ' CustomAgent/2.0 '))
      .toBe('CustomAgent/2.0');
  });

  it('falls back to the selected browser, version, and OS when custom value is blank', () => {
    expect(getEffectiveUserAgent('chrome', '131.0.6778.86', 'mac', '  '))
      .toBe(getBrowserUserAgent('chrome', '131.0.6778.86', 'mac'));
    expect(getEffectiveUserAgent('edge', '131.0.2903.86', 'windows'))
      .toBe(getBrowserUserAgent('edge', '131.0.2903.86', 'windows'));
  });
});
