// Storage abstraction: Upstash Redis if configured, otherwise in-memory map (dev)
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local / Vercel.

let redis = null;
let redisChecked = false;
const memoryStore = globalThis.__SV_BOOKING_MEMORY_KV__ || new Map();
globalThis.__SV_BOOKING_MEMORY_KV__ = memoryStore;
const MAX_MEMORY_ENTRIES = 5000; // LRU cap for dev mode

async function getRedis() {
  if (redisChecked) return redis;
  redisChecked = true;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const mod = await import(/* webpackIgnore: true */ '@upstash/redis');
    redis = new mod.Redis({ url, token });
    return redis;
  } catch {
    return null;
  }
}

/** Check if an in-memory entry has expired and clean it up */
function getMemoryValue(key) {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  // Plain values (no TTL) are stored directly
  if (typeof entry !== 'object' || !entry.__ttl) return entry;
  // TTL entries: check expiry
  if (Date.now() > entry.__expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.__value;
}

/** Evict oldest entries when memory store exceeds cap */
function evictIfNeeded() {
  if (memoryStore.size <= MAX_MEMORY_ENTRIES) return;
  // Delete oldest 20% of entries (Map iterates in insertion order)
  const toDelete = Math.max(1, Math.floor(memoryStore.size * 0.2));
  let deleted = 0;
  for (const key of memoryStore.keys()) {
    if (deleted >= toDelete) break;
    memoryStore.delete(key);
    deleted++;
  }
}

/** Simple glob pattern matching for in-memory keys (supports * and ?) */
function globMatch(pattern, str) {
  const regex = new RegExp(
    '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
  );
  return regex.test(str);
}

export const kv = {
  async get(key) {
    const r = await getRedis();
    if (r) return await r.get(key);
    return getMemoryValue(key);
  },

  async set(key, value) {
    const r = await getRedis();
    if (r) {
      // Upstash Redis auto-serializes JSON — don't double-stringify
      await r.set(key, value);
      return;
    }
    memoryStore.set(key, value);
    evictIfNeeded();
  },

  /** Set a key with a TTL in seconds */
  async setWithTTL(key, value, ttlSeconds) {
    const r = await getRedis();
    if (r) {
      await r.set(key, value, { ex: ttlSeconds });
      return;
    }
    memoryStore.set(key, {
      __ttl: true,
      __value: value,
      __expiresAt: Date.now() + ttlSeconds * 1000,
    });
    evictIfNeeded();
  },

  async del(key) {
    const r = await getRedis();
    if (r) {
      await r.del(key);
      return;
    }
    memoryStore.delete(key);
  },

  /** Get multiple keys at once */
  async mget(...keys) {
    const flatKeys = keys.flat();
    const r = await getRedis();
    if (r) return await r.mget(...flatKeys);
    return flatKeys.map((k) => getMemoryValue(k));
  },

  /** Scan keys matching a glob pattern (e.g. "price:*", "agent:status:*") */
  async keys(pattern) {
    const r = await getRedis();
    if (r) return await r.keys(pattern);
    const matched = [];
    for (const key of memoryStore.keys()) {
      if (globMatch(pattern, key)) {
        // Skip expired entries
        if (getMemoryValue(key) !== null) {
          matched.push(key);
        }
      }
    }
    return matched;
  },

  async isConfigured() {
    return Boolean(await getRedis());
  },
};
