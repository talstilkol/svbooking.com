// Storage abstraction: Upstash Redis if configured, otherwise in-memory map (dev)
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local / Vercel.

let redis = null;
let redisChecked = false;
const memoryStore = new Map();

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

export const kv = {
  async get(key) {
    const r = await getRedis();
    if (r) return await r.get(key);
    return memoryStore.get(key) ?? null;
  },
  async set(key, value) {
    const r = await getRedis();
    if (r) {
      await r.set(key, JSON.stringify(value));
      return;
    }
    memoryStore.set(key, value);
  },
  async del(key) {
    const r = await getRedis();
    if (r) {
      await r.del(key);
      return;
    }
    memoryStore.delete(key);
  },
  async isConfigured() {
    return Boolean(await getRedis());
  },
};
