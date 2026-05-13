/**
 * Lightweight sliding-window rate limiter backed by KV (Upstash Redis).
 * Falls back to in-memory when KV is unavailable (dev mode).
 *
 * Usage:
 *   import { rateLimit } from '@/lib/rate-limit';
 *   const limiter = rateLimit({ limit: 30, window: 60 }); // 30 req/min
 *   const { success, remaining } = await limiter.check(ip);
 */

import { kv } from '@/lib/kv';

/**
 * @param {{ limit: number, window: number }} opts
 *   limit  — max requests allowed in the window
 *   window — window duration in seconds
 */
export function rateLimit({ limit = 30, window = 60 } = {}) {
  return {
    /**
     * @param {string} identifier — typically the client IP
     * @returns {Promise<{ success: boolean, remaining: number, reset: number }>}
     */
    async check(identifier) {
      const key = `rl:${identifier}`;
      const now = Date.now();

      try {
        const entry = (await kv.get(key)) || { count: 0, resetAt: now + window * 1000 };

        // Window expired — reset
        if (now > entry.resetAt) {
          const fresh = { count: 1, resetAt: now + window * 1000 };
          await kv.setWithTTL(key, fresh, window + 5); // +5s buffer
          return { success: true, remaining: limit - 1, reset: fresh.resetAt };
        }

        // Within window
        entry.count += 1;
        const remaining = Math.max(limit - entry.count, 0);
        const success = entry.count <= limit;

        // Only write back if under limit (avoid KV churn for blocked requests)
        if (success) {
          const ttl = Math.ceil((entry.resetAt - now) / 1000) + 5;
          await kv.setWithTTL(key, entry, ttl);
        }

        return { success, remaining, reset: entry.resetAt };
      } catch {
        // If KV fails, allow the request (fail open)
        return { success: true, remaining: limit, reset: now + window * 1000 };
      }
    },
  };
}

/**
 * Helper to extract client IP from a Next.js request.
 * Works on Vercel (x-forwarded-for) and locally.
 */
export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

/**
 * Rate limit response helper — returns a 429 Response.
 */
export function rateLimitResponse(resetAt) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return Response.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(retryAfter, 1)),
        'X-RateLimit-Reset': String(resetAt),
      },
    }
  );
}
