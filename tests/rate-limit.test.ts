import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { kv } from '@/lib/kv';

// Mock the KV module to use in-memory storage for tests
vi.mock('@/lib/kv', () => {
  const store = new Map<string, unknown>();
  return {
    kv: {
      get: vi.fn(async (key: string) => store.get(key) || null),
      set: vi.fn(async (key: string, value: unknown) => store.set(key, value)),
      setWithTTL: vi.fn(async (key: string, value: unknown) => store.set(key, value)),
    },
    __store: store,
  };
});

describe('rate-limit', () => {
  beforeEach(async () => {
    const mod = await import('@/lib/kv') as Record<string, unknown>;
    (mod.__store as Map<string, unknown>).clear();
    vi.clearAllMocks();
  });

  describe('rateLimit', () => {
    it('allows requests under the limit', async () => {
      const limiter = rateLimit({ limit: 5, window: 60 });
      const result = await limiter.check('127.0.0.1');
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('blocks requests over the limit', async () => {
      const limiter = rateLimit({ limit: 3, window: 60 });

      await limiter.check('1.2.3.4'); // 1
      await limiter.check('1.2.3.4'); // 2
      await limiter.check('1.2.3.4'); // 3
      const blocked = await limiter.check('1.2.3.4'); // 4 — should be blocked

      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('tracks different IPs independently', async () => {
      const limiter = rateLimit({ limit: 2, window: 60 });

      await limiter.check('1.1.1.1');
      await limiter.check('1.1.1.1');
      const blockedFirst = await limiter.check('1.1.1.1');

      const allowedSecond = await limiter.check('2.2.2.2');

      expect(blockedFirst.success).toBe(false);
      expect(allowedSecond.success).toBe(true);
    });

    it('returns reset timestamp', async () => {
      const limiter = rateLimit({ limit: 5, window: 60 });
      const now = Date.now();
      const result = await limiter.check('test-ip');

      expect(result.reset).toBeGreaterThan(now);
      expect(result.reset).toBeLessThanOrEqual(now + 61000);
    });

    it('scopes counters by namespace', async () => {
      const compareLimiter = rateLimit({ namespace: 'compare', limit: 1, window: 60 });
      const clickLimiter = rateLimit({ namespace: 'click', limit: 1, window: 60 });

      await compareLimiter.check('3.3.3.3');
      const compareBlocked = await compareLimiter.check('3.3.3.3');
      const clickAllowed = await clickLimiter.check('3.3.3.3');

      expect(compareBlocked.success).toBe(false);
      expect(clickAllowed.success).toBe(true);
    });

    it('fails closed when configured and KV is unavailable', async () => {
      vi.mocked(kv.get).mockRejectedValueOnce(new Error('KV unavailable'));

      const limiter = rateLimit({ namespace: 'catalog-validate', limit: 1, window: 60, failOpen: false });
      const result = await limiter.check('4.4.4.4');

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('fails open by default when KV is unavailable', async () => {
      vi.mocked(kv.get).mockRejectedValueOnce(new Error('KV unavailable'));

      const limiter = rateLimit({ namespace: 'default-open', limit: 2, window: 10 });
      const result = await limiter.check('5.5.5.5');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('resets expired windows and falls back to the local identifier for empty input', async () => {
      const now = Date.now();
      const limiter = rateLimit({ namespace: 'expired-window', limit: 2, window: 60 });
      await kv.setWithTTL('rl:expired-window:127.0.0.1', { count: 2, resetAt: now - 1000 }, 60);

      const result = await limiter.check('');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(1);
      expect(result.reset).toBeGreaterThan(now);
      expect(kv.setWithTTL).toHaveBeenLastCalledWith(
        'rl:expired-window:127.0.0.1',
        expect.objectContaining({ count: 1 }),
        65
      );
    });
  });

  describe('getClientIp', () => {
    it('extracts IP from x-forwarded-for', () => {
      const req = {
        headers: new Headers({
          'x-forwarded-for': '1.2.3.4, 5.6.7.8',
        }),
      } as Request;
      expect(getClientIp(req)).toBe('1.2.3.4');
    });

    it('extracts IP from x-real-ip', () => {
      const req = {
        headers: new Headers({
          'x-real-ip': '10.0.0.1',
        }),
      } as Request;
      expect(getClientIp(req)).toBe('10.0.0.1');
    });

    it('prefers Cloudflare connecting IP when present', () => {
      const req = {
        headers: new Headers({
          'cf-connecting-ip': '203.0.113.10',
          'x-forwarded-for': '1.2.3.4',
        }),
      } as Request;
      expect(getClientIp(req)).toBe('203.0.113.10');
    });

    it('normalizes IPv4 ports and bracketed IPv6 addresses', () => {
      const ipv4Req = {
        headers: new Headers({
          'x-forwarded-for': '198.51.100.22:443',
        }),
      } as Request;
      const ipv6Req = {
        headers: new Headers({
          'x-forwarded-for': '[2001:db8::1]:443',
        }),
      } as Request;

      expect(getClientIp(ipv4Req)).toBe('198.51.100.22');
      expect(getClientIp(ipv6Req)).toBe('2001:db8::1');
    });

    it('falls back when forwarded IP headers are invalid or unknown', () => {
      const req = {
        headers: new Headers({
          'x-forwarded-for': 'unknown',
          'x-real-ip': '999.999.999.999',
        }),
      } as Request;
      expect(getClientIp(req)).toBe('127.0.0.1');
    });

    it('normalizes IPv4-mapped IPv6 and rejects malformed IP variants', () => {
      const mappedIpv4Req = {
        headers: new Headers({
          'x-forwarded-for': '::ffff:198.51.100.24',
        }),
      } as Request;
      const fullIpv6Req = {
        headers: new Headers({
          'x-forwarded-for': '2001:0DB8:0000:0000:0000:FF00:0042:8329',
        }),
      } as Request;
      const malformedReq = {
        headers: new Headers({
          'x-forwarded-for': '[2001:db8::1',
          'x-real-ip': '2001::db8::1',
        }),
      } as Request;
      const oversizedGroupReq = {
        headers: new Headers({
          'x-forwarded-for': '2001:db8:00000::1',
        }),
      } as Request;
      const badIpv4TokenReq = {
        headers: new Headers({
          'x-forwarded-for': '198.51.100.bad',
        }),
      } as Request;

      expect(getClientIp(mappedIpv4Req)).toBe('198.51.100.24');
      expect(getClientIp(fullIpv6Req)).toBe('2001:0db8:0000:0000:0000:ff00:0042:8329');
      expect(getClientIp(malformedReq)).toBe('127.0.0.1');
      expect(getClientIp(oversizedGroupReq)).toBe('127.0.0.1');
      expect(getClientIp(badIpv4TokenReq)).toBe('127.0.0.1');
    });

    it('falls back to 127.0.0.1', () => {
      const req = {
        headers: new Headers({}),
      } as Request;
      expect(getClientIp(req)).toBe('127.0.0.1');
    });
  });

  describe('rateLimitResponse', () => {
    it('marks throttled responses as no-store with retry metadata', async () => {
      const resetAt = Date.now() + 30_000;
      const response = rateLimitResponse(resetAt);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('retry-after')).toBeTruthy();
      expect(response.headers.get('X-RateLimit-Reset')).toBe(String(resetAt));
      expect(body.error).toBe('Too many requests. Please try again later.');
    });
  });
});
