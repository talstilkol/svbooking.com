import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use the real kv module — without Redis env vars it falls back to in-memory
// This tests the in-memory fallback behavior
const { kv } = await import('@/lib/kv');

describe('kv (in-memory mode)', () => {
  beforeEach(async () => {
    // Clean up test keys
    await kv.del('test:key1');
    await kv.del('test:key2');
    await kv.del('test:ttl');
    await kv.del('test:ttl-expire');
    await kv.del('test:glob.1');
    await kv.del('test:glob-a');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.doUnmock('@upstash/redis');
  });

  describe('get/set', () => {
    it('stores and retrieves a string', async () => {
      await kv.set('test:key1', 'hello');
      expect(await kv.get('test:key1')).toBe('hello');
    });

    it('stores and retrieves an object', async () => {
      const obj = { name: 'Hilton', price: 200 };
      await kv.set('test:key2', obj);
      const result = await kv.get('test:key2');
      expect(result).toEqual(obj);
    });

    it('returns null for missing keys', async () => {
      expect(await kv.get('test:nonexistent')).toBeNull();
    });
  });

  describe('setWithTTL', () => {
    it('stores value with TTL', async () => {
      await kv.setWithTTL('test:ttl', 'value', 3600);
      expect(await kv.get('test:ttl')).toBe('value');
    });

    it('expires TTL values and omits expired entries from key scans', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'));

      await kv.setWithTTL('test:ttl-expire', 'value', 1);
      expect(await kv.get('test:ttl-expire')).toBe('value');

      vi.setSystemTime(new Date('2026-06-01T00:00:01.001Z'));

      expect(await kv.get('test:ttl-expire')).toBeNull();
      expect(await kv.keys('test:ttl-*')).not.toContain('test:ttl-expire');
    });
  });

  describe('del', () => {
    it('deletes a key', async () => {
      await kv.set('test:key1', 'hello');
      await kv.del('test:key1');
      expect(await kv.get('test:key1')).toBeNull();
    });

    it('does not throw for missing key', async () => {
      await expect(kv.del('test:nonexistent')).resolves.not.toThrow();
    });
  });

  describe('mget', () => {
    it('retrieves multiple keys at once', async () => {
      await kv.set('test:key1', 'a');
      await kv.set('test:key2', 'b');
      const results = await kv.mget('test:key1', 'test:key2', 'test:nonexistent');
      expect(results).toEqual(['a', 'b', null]);
    });

    it('accepts array inputs for batch reads', async () => {
      await kv.set('test:key1', 'a');
      await kv.set('test:key2', 'b');

      await expect(kv.mget(['test:key1', 'test:key2', 'test:nonexistent'])).resolves.toEqual(['a', 'b', null]);
    });
  });

  describe('keys', () => {
    it('finds keys matching a pattern', async () => {
      await kv.set('test:key1', 'a');
      await kv.set('test:key2', 'b');
      const matched = await kv.keys('test:*');
      expect(matched).toContain('test:key1');
      expect(matched).toContain('test:key2');
    });

    it('supports ? wildcard matching while escaping literal dots', async () => {
      await kv.set('test:glob.1', 'dot');
      await kv.set('test:glob-a', 'dash');

      const matched = await kv.keys('test:glob.?');

      expect(matched).toContain('test:glob.1');
      expect(matched).not.toContain('test:glob-a');
    });

    it('omits expired entries during scans even when they were not read first', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'));

      await kv.setWithTTL('test:ttl-scan-expired', 'value', 1);
      vi.setSystemTime(new Date('2026-06-01T00:00:01.001Z'));

      await expect(kv.keys('test:ttl-scan-*')).resolves.toEqual([]);
    });
  });

  describe('memory cap', () => {
    it('evicts oldest in-memory entries when the development store exceeds its cap', async () => {
      const keys = Array.from({ length: 5001 }, (_, index) => `evict:${index}`);

      try {
        for (const key of keys) {
          await kv.set(key, key);
        }

        expect(await kv.get('evict:0')).toBeNull();
        expect(await kv.get('evict:5000')).toBe('evict:5000');
      } finally {
        for (const key of keys) {
          await kv.del(key);
        }
      }
    });
  });

  describe('isConfigured', () => {
    it('returns false when no Redis env vars are set', async () => {
      expect(await kv.isConfigured()).toBe(false);
    });

    it('uses the Redis adapter when durable KV env vars are configured', async () => {
      const redisStore = new Map<string, unknown>();
      const calls = {
        config: null as null | { url: string; token: string },
        ttl: null as null | { ex: number },
        deleted: '',
        mgetKeys: [] as string[],
        keysPattern: '',
      };

      vi.stubEnv('KV_REST_API_URL', 'https://redis.svbooking.invalid');
      vi.stubEnv('KV_REST_API_TOKEN', 'redis-token');
      vi.doMock('@upstash/redis', () => ({
        Redis: class {
          constructor(config: { url: string; token: string }) {
            calls.config = config;
          }

          async get(key: string) {
            return redisStore.get(key) || null;
          }

          async set(key: string, value: unknown, opts?: { ex: number }) {
            calls.ttl = opts || null;
            redisStore.set(key, value);
          }

          async del(key: string) {
            calls.deleted = key;
            redisStore.delete(key);
          }

          async mget(...keys: string[]) {
            calls.mgetKeys = keys;
            return keys.map((key) => redisStore.get(key) || null);
          }

          async keys(pattern: string) {
            calls.keysPattern = pattern;
            return Array.from(redisStore.keys()).filter((key) => key.startsWith(pattern.replace('*', '')));
          }
        },
      }));
      vi.resetModules();
      const { kv: redisKv } = await import('@/lib/kv');

      await redisKv.set('redis:key1', 'a');
      await redisKv.setWithTTL('redis:key2', 'b', 60);
      await expect(redisKv.get('redis:key1')).resolves.toBe('a');
      await expect(redisKv.mget('redis:key1', 'redis:key2', 'redis:missing')).resolves.toEqual(['a', 'b', null]);
      await expect(redisKv.keys('redis:*')).resolves.toEqual(['redis:key1', 'redis:key2']);
      await redisKv.del('redis:key1');

      expect(await redisKv.isConfigured()).toBe(true);
      expect(calls.config).toEqual({ url: 'https://redis.svbooking.invalid', token: 'redis-token' });
      expect(calls.ttl).toEqual({ ex: 60 });
      expect(calls.mgetKeys).toEqual(['redis:key1', 'redis:key2', 'redis:missing']);
      expect(calls.keysPattern).toBe('redis:*');
      expect(calls.deleted).toBe('redis:key1');
    });

    it('falls back to in-memory storage when the Redis adapter cannot be imported', async () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.svbooking.invalid');
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'redis-token');
      vi.doMock('@upstash/redis', () => {
        throw new Error('redis module unavailable');
      });
      vi.resetModules();
      const { kv: fallbackKv } = await import('@/lib/kv');

      await expect(fallbackKv.isConfigured()).resolves.toBe(false);
      await fallbackKv.set('redis:import-fallback', 'memory-value');
      await expect(fallbackKv.get('redis:import-fallback')).resolves.toBe('memory-value');
      await fallbackKv.del('redis:import-fallback');
    });
  });
});
