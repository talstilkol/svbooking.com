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
  });

  describe('isConfigured', () => {
    it('returns false when no Redis env vars are set', async () => {
      expect(await kv.isConfigured()).toBe(false);
    });
  });
});
