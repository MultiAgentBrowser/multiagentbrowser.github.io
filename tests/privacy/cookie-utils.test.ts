import { describe, it, expect } from 'vitest';
import { CookieUtils } from '../../src/privacy/cookies/cookie-utils';

describe('CookieUtils Domain Parsing & Third-Party Detection', () => {
  it('extracts base domain for standard TLDs', () => {
    expect(CookieUtils.getBaseDomain('example.com')).toBe('example.com');
    expect(CookieUtils.getBaseDomain('sub.example.com')).toBe('example.com');
    expect(CookieUtils.getBaseDomain('deep.nested.sub.example.com')).toBe('example.com');
  });

  it('handles multi-part country-code TLDs accurately', () => {
    expect(CookieUtils.getBaseDomain('bbc.co.uk')).toBe('bbc.co.uk');
    expect(CookieUtils.getBaseDomain('news.bbc.co.uk')).toBe('bbc.co.uk');
    expect(CookieUtils.getBaseDomain('tracker.adserver.com.au')).toBe('adserver.com.au');
  });

  it('handles IP addresses and localhost', () => {
    expect(CookieUtils.getBaseDomain('127.0.0.1')).toBe('127.0.0.1');
    expect(CookieUtils.getBaseDomain('localhost')).toBe('localhost');
  });

  it('correctly identifies third-party cross-origin requests', () => {
    const firstParty = 'https://nytimes.com/world';
    const thirdPartyTracker = 'https://doubleclick.net/pixel';
    const firstPartySubdomain = 'https://static.nytimes.com/style.css';

    expect(CookieUtils.isThirdParty(firstParty, thirdPartyTracker)).toBe(true);
    expect(CookieUtils.isThirdParty(firstParty, firstPartySubdomain)).toBe(false);
    expect(CookieUtils.isThirdParty(firstParty, firstParty)).toBe(false);
  });
});

