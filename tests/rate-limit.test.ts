import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Mock the KV module to use in-memory storage for tests
vi.mock('@/lib/kv', () => {
  const store = new Map<string, any>();
  return {
    kv: {
      get: vi.fn(async (key: string) => store.get(key) || null),
      set: vi.fn(async (key: string, value: any) => store.set(key, value)),
      setWithTTL: vi.fn(async (key: string, value: any) => store.set(key, value)),
    },
    __store: store,
  };
});

describe('rate-limit', () => {
  beforeEach(async () => {
    const { __store } = await import('@/lib/kv') as any;
    __store.clear();
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
  });

  describe('getClientIp', () => {
    it('extracts IP from x-forwarded-for', () => {
      const req = {
        headers: new Headers({
          'x-forwarded-for': '1.2.3.4, 5.6.7.8',
        }),
      } as any;
      expect(getClientIp(req)).toBe('1.2.3.4');
    });

    it('extracts IP from x-real-ip', () => {
      const req = {
        headers: new Headers({
          'x-real-ip': '10.0.0.1',
        }),
      } as any;
      expect(getClientIp(req)).toBe('10.0.0.1');
    });

    it('falls back to 127.0.0.1', () => {
      const req = {
        headers: new Headers({}),
      } as any;
      expect(getClientIp(req)).toBe('127.0.0.1');
    });
  });
});
