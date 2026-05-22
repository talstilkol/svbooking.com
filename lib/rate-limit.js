/**
 * Lightweight sliding-window rate limiter backed by KV (Upstash Redis).
 * Falls back to in-memory when KV is unavailable (dev mode).
 *
 * Usage:
 *   import { rateLimit } from '@/lib/rate-limit';
 *   const limiter = rateLimit({ namespace: 'compare', limit: 30, window: 60 }); // 30 req/min
 *   const { success, remaining } = await limiter.check(ip);
 */

import { kv } from '@/lib/kv';

const FALLBACK_CLIENT_IP = '127.0.0.1';
const MAX_IDENTIFIER_LENGTH = 128;

function firstHeaderValue(value) {
  return String(value || '').split(',')[0].trim();
}

function isValidIpv4(value) {
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const parsed = Number(part);
    return parsed >= 0 && parsed <= 255;
  });
}

function isValidIpv6(value) {
  if (!value.includes(':') || !/^[0-9a-f:]+$/i.test(value)) return false;
  if ((value.match(/::/g) || []).length > 1) return false;

  const groups = value.split(':');
  const populatedGroups = groups.filter(Boolean);
  if (populatedGroups.some((group) => group.length > 4)) return false;

  return value.includes('::')
    ? populatedGroups.length <= 8
    : populatedGroups.length === 8;
}

function normalizeClientIp(value) {
  const raw = firstHeaderValue(value);
  if (!raw || raw.toLowerCase() === 'unknown') return '';

  let candidate = raw;
  if (candidate.startsWith('[')) {
    const bracketEnd = candidate.indexOf(']');
    candidate = bracketEnd > 0 ? candidate.slice(1, bracketEnd) : candidate;
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    candidate = candidate.slice(0, candidate.lastIndexOf(':'));
  }

  candidate = candidate.replace(/^::ffff:/i, '');

  if (isValidIpv4(candidate)) return candidate;
  if (isValidIpv6(candidate)) return candidate.toLowerCase();
  return '';
}

function normalizeIdentifier(identifier) {
  const cleaned = String(identifier || '').trim().slice(0, MAX_IDENTIFIER_LENGTH);
  return cleaned || FALLBACK_CLIENT_IP;
}

/**
 * @param {{ limit?: number, window?: number, namespace?: string, failOpen?: boolean }} opts
 *   limit  — max requests allowed in the window
 *   window — window duration in seconds
 *   namespace — route/action scope so one endpoint does not consume another endpoint's quota
 *   failOpen — whether requests are allowed when KV is unavailable
 */
export function rateLimit({ limit = 30, window = 60, namespace = 'global', failOpen = true } = {}) {
  return {
    /**
     * @param {string} identifier — typically the client IP
     * @returns {Promise<{ success: boolean, remaining: number, reset: number }>}
     */
    async check(identifier) {
      const key = `rl:${namespace}:${encodeURIComponent(normalizeIdentifier(identifier))}`;
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
        const reset = now + window * 1000;
        if (failOpen) {
          return { success: true, remaining: limit, reset };
        }
        return { success: false, remaining: 0, reset };
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
    normalizeClientIp(request.headers.get('cf-connecting-ip')) ||
    normalizeClientIp(request.headers.get('x-forwarded-for')) ||
    normalizeClientIp(request.headers.get('x-real-ip')) ||
    FALLBACK_CLIENT_IP
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
        'Cache-Control': 'no-store',
        'Retry-After': String(Math.max(retryAfter, 1)),
        'X-RateLimit-Reset': String(resetAt),
      },
    }
  );
}
