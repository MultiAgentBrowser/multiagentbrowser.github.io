import { describe, it, expect } from 'vitest';
import { NavigationController } from '../../src/browser/navigation-controller';

describe('NavigationController URL Sanitization & Guards', () => {
  it('returns about:blank for empty inputs', () => {
    expect(NavigationController.sanitizeUrl('')).toBe('about:blank');
    expect(NavigationController.sanitizeUrl('   ')).toBe('about:blank');
  });

  it('preserves valid https and http URLs', () => {
    expect(NavigationController.sanitizeUrl('https://github.com')).toBe('https://github.com/');
    expect(NavigationController.sanitizeUrl('http://example.com/test')).toBe('http://example.com/test');
  });

  it('prepends https:// to standard domain names without protocols', () => {
    expect(NavigationController.sanitizeUrl('duckduckgo.com')).toBe('https://duckduckgo.com');
    expect(NavigationController.sanitizeUrl('sub.domain.org/path?q=1')).toBe('https://sub.domain.org/path?q=1');
    expect(NavigationController.sanitizeUrl('localhost:8080')).toBe('https://localhost:8080');
  });

  it('blocks dangerous schemes like javascript:, vbscript:, and file:', () => {
    expect(NavigationController.sanitizeUrl('javascript:alert(1)')).toBe('about:blank');
    expect(NavigationController.sanitizeUrl('vbscript:msgbox(1)')).toBe('about:blank');
    expect(NavigationController.sanitizeUrl('file:///etc/passwd')).toBe('about:blank');
  });

  it('converts non-URL search queries to privacy-preserving DuckDuckGo search', () => {
    expect(NavigationController.sanitizeUrl('what is browser fingerprinting')).toBe(
      'https://duckduckgo.com/?q=what%20is%20browser%20fingerprinting'
    );
  });
});

