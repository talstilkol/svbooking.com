import { kv } from '@/lib/kv';
import { requireUser } from '@/lib/auth';
import { errorResponse, ValidationError } from '@/lib/validation';
import { userDataKey } from '@/lib/user-data';
import { assertSameOrigin } from '@/lib/request-origin';
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const userDataMutationLimiter = rateLimit({ namespace: 'user-data-mutations', limit: 30, window: 60, failOpen: false });

const VALID_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY',
  'HKD', 'SGD', 'ILS', 'AED', 'THB', 'INR',
]);

async function enforceUserDataMutationRateLimit(request) {
  const { success, reset } = await userDataMutationLimiter.check(getClientIp(request));
  return success ? null : rateLimitResponse(reset);
}

export async function GET() {
  try {
    const user = await requireUser();
    const data = (await kv.get(userDataKey(user.id, 'preferences'))) || {};
    return Response.json(
      { prefs: data, cloudEnabled: await kv.isConfigured() },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(request) {
  try {
    assertSameOrigin(request);
    const limited = await enforceUserDataMutationRateLimit(request);
    if (limited) return limited;

    const user = await requireUser();
    const body = await request.json();
    const { homeCity, defaultGuests, defaultTripLength, currency, favoriteDestinations } = body || {};

    const clean = {};
    if (homeCity !== undefined) clean.homeCity = String(homeCity).trim().slice(0, 80);
    if (defaultGuests !== undefined) {
      const n = Number(defaultGuests);
      if (!Number.isInteger(n) || n < 1 || n > 20) throw new ValidationError('defaultGuests must be 1-20');
      clean.defaultGuests = n;
    }
    if (defaultTripLength !== undefined) {
      const n = Number(defaultTripLength);
      if (!Number.isInteger(n) || n < 1 || n > 60) throw new ValidationError('defaultTripLength must be 1-60');
      clean.defaultTripLength = n;
    }
    if (currency !== undefined) {
      if (!VALID_CURRENCIES.has(currency)) throw new ValidationError('Invalid currency');
      clean.currency = currency;
    }
    if (favoriteDestinations !== undefined) {
      if (!Array.isArray(favoriteDestinations)) throw new ValidationError('favoriteDestinations must be array');
      clean.favoriteDestinations = favoriteDestinations
        .filter((s) => typeof s === 'string')
        .map((s) => s.trim())
        .slice(0, 20);
    }
    clean.updatedAt = new Date().toISOString();

    const existing = (await kv.get(userDataKey(user.id, 'preferences'))) || {};
    const merged = { ...existing, ...clean };
    await kv.set(userDataKey(user.id, 'preferences'), merged);
    return Response.json({ prefs: merged }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return errorResponse(err);
  }
}
