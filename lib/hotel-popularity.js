/**
 * Hotel Popularity Tracker — lightweight KV-backed request counters.
 *
 * Tracks how many dated price comparison requests each hotel receives.
 * Used by the price cache agent to prioritize popular hotels for pre-warming.
 *
 * Storage: KV key `hotel-popularity` → { [hotelKey]: count }
 * TTL: 7 days (rolling window, reset weekly)
 */

import { kv } from './kv';

const POPULARITY_KEY = 'hotel-popularity';
const POPULARITY_TTL = 7 * 86400; // 7 days

// In-memory write buffer to batch KV writes
let pendingBumps = new Map();
let flushTimer = null;

/**
 * Bump a hotel's popularity counter (fire-and-forget, batched).
 * Batches increments in memory and flushes to KV every 30 seconds.
 */
export function bumpHotelPopularity(hotelKey) {
  if (!hotelKey) return;
  pendingBumps.set(hotelKey, (pendingBumps.get(hotelKey) || 0) + 1);

  if (!flushTimer) {
    flushTimer = setTimeout(flushPopularity, 30000);
  }
}

async function flushPopularity() {
  flushTimer = null;
  const bumps = pendingBumps;
  pendingBumps = new Map();

  if (bumps.size === 0) return;

  try {
    const current = (await kv.get(POPULARITY_KEY)) || {};
    for (const [key, count] of bumps) {
      current[key] = (current[key] || 0) + count;
    }
    await kv.setWithTTL(POPULARITY_KEY, current, POPULARITY_TTL);
  } catch {
    // KV unavailable — counters lost (non-critical)
  }
}

/**
 * Get hotel popularity map for pre-warm prioritization.
 * Returns { [hotelKey]: requestCount } sorted by popularity.
 */
export async function getHotelPopularity() {
  try {
    return (await kv.get(POPULARITY_KEY)) || {};
  } catch {
    return {};
  }
}

/**
 * Get the top N most popular hotel keys.
 */
export async function getTopPopularHotelKeys(limit = 50) {
  const popularity = await getHotelPopularity();
  return Object.entries(popularity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([key]) => key);
}
