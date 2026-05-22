import { describe, expect, it } from 'vitest';
import {
  assertSameOrigin,
  expectedRequestOrigin,
  isSameOriginRequest,
} from '@/lib/request-origin';

describe('request origin guard', () => {
  it('accepts same-origin browser requests', () => {
    const request = new Request('https://svbooking.com/api/me/trips', {
      method: 'POST',
      headers: {
        origin: 'https://svbooking.com',
        host: 'svbooking.com',
        'sec-fetch-site': 'same-origin',
      },
    });

    expect(expectedRequestOrigin(request)).toBe('https://svbooking.com');
    expect(isSameOriginRequest(request)).toBe(true);
    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  it('uses forwarded host and protocol behind a proxy', () => {
    const request = new Request('http://127.0.0.1:3000/api/me/trips', {
      method: 'POST',
      headers: {
        origin: 'https://svbooking.com',
        host: '127.0.0.1:3000',
        'x-forwarded-host': 'svbooking.com',
        'x-forwarded-proto': 'https',
      },
    });

    expect(expectedRequestOrigin(request)).toBe('https://svbooking.com');
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it('rejects cross-origin browser requests', () => {
    const request = new Request('https://svbooking.com/api/me/trips', {
      method: 'POST',
      headers: {
        origin: 'https://evil.example',
        host: 'svbooking.com',
      },
    });

    expect(isSameOriginRequest(request)).toBe(false);
    expect(() => assertSameOrigin(request)).toThrow('Same-origin request required');
  });

  it('accepts same-origin referer when Origin is absent', () => {
    const request = new Request('https://svbooking.com/api/me/trips', {
      method: 'POST',
      headers: {
        host: 'svbooking.com',
        referer: 'https://svbooking.com/trips',
      },
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it('rejects cross-origin referer when Origin is absent', () => {
    const request = new Request('https://svbooking.com/api/me/trips', {
      method: 'POST',
      headers: {
        host: 'svbooking.com',
        referer: 'https://evil.example/form',
      },
    });

    expect(isSameOriginRequest(request)).toBe(false);
    expect(() => assertSameOrigin(request)).toThrow('Same-origin request required');
  });

  it('rejects unsupported origin protocols', () => {
    const request = new Request('https://svbooking.com/api/me/trips', {
      method: 'POST',
      headers: {
        origin: 'chrome-extension://extension-id',
        host: 'svbooking.com',
      },
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it('rejects cross-site fetch metadata even when Origin is absent', () => {
    const request = new Request('https://svbooking.com/api/me/trips', {
      method: 'POST',
      headers: {
        host: 'svbooking.com',
        'sec-fetch-site': 'cross-site',
      },
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it('rejects same-site browser metadata without an exact Origin', () => {
    const request = new Request('https://svbooking.com/api/me/trips', {
      method: 'POST',
      headers: {
        host: 'svbooking.com',
        'sec-fetch-site': 'same-site',
      },
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it('allows non-browser clients without Origin or fetch metadata', () => {
    const request = new Request('https://svbooking.com/api/me/trips', {
      method: 'POST',
      headers: { host: 'svbooking.com' },
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });
});
