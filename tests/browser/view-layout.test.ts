import { describe, it, expect } from 'vitest';
import { ViewLayout } from '../../src/browser/view-layout';

describe('ViewLayout Viewport Bounds Calculation', () => {
  it('correctly calculates docked viewport bounds below navigation bar and above status bar', () => {
    const bounds = ViewLayout.calculateViewportBounds(1280, 800);
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(ViewLayout.TOP_NAV_HEIGHT); // 88px
    expect(bounds.width).toBe(1280);
    // 800 - 88 (top) - 28 (bottom) = 684
    expect(bounds.height).toBe(684);
  });

  it('handles small window sizes safely without returning negative heights', () => {
    const bounds = ViewLayout.calculateViewportBounds(100, 50);
    expect(bounds.width).toBe(100);
    expect(bounds.height).toBe(0);
  });
});

