import { describe, it, expect, beforeEach } from 'vitest';

// Use the real kv module — without Redis env vars it falls back to in-memory
// This tests the in-memory fallback behavior
const { kv } = await import('@/lib/kv');

describe('kv (in-memory mode)', () => {
  beforeEach(async () => {
    // Clean up test keys
    await kv.del('test:key1');
    await kv.del('test:key2');
    await kv.del('test:ttl');
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
  });

  describe('keys', () => {
    it('finds keys matching a pattern', async () => {
      await kv.set('test:key1', 'a');
      await kv.set('test:key2', 'b');
      const matched = await kv.keys('test:*');
      expect(matched).toContain('test:key1');
      expect(matched).toContain('test:key2');
    });
  });

  describe('isConfigured', () => {
    it('returns false when no Redis env vars are set', async () => {
      expect(await kv.isConfigured()).toBe(false);
    });
  });
});
