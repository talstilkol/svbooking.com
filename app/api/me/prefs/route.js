import { kv } from '@/lib/kv';
import { requireUser } from '@/lib/auth';
import { errorResponse, ValidationError } from '@/lib/validation';

function key(uid) {
  return `user:${uid}:prefs`;
}

const VALID_CURRENCIES = new Set(['USD', 'EUR', 'ILS', 'GBP']);

export async function GET() {
  try {
    const user = await requireUser();
    const data = (await kv.get(key(user.id))) || {};
    return Response.json({ prefs: data, cloudEnabled: kv.isConfigured() });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(request) {
  try {
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

    const existing = (await kv.get(key(user.id))) || {};
    const merged = { ...existing, ...clean };
    await kv.set(key(user.id), merged);
    return Response.json({ prefs: merged });
  } catch (err) {
    return errorResponse(err);
  }
}
