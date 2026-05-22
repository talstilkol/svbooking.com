import { kv } from '@/lib/kv';
import { requireUser } from '@/lib/auth';
import { errorResponse, ValidationError, parseDate } from '@/lib/validation';
import { hashId } from '@/lib/utils/hashId';
import { userDataKey } from '@/lib/user-data';
import { assertSameOrigin } from '@/lib/request-origin';
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const userDataMutationLimiter = rateLimit({ namespace: 'user-data-mutations', limit: 30, window: 60, failOpen: false });

function validClientTripId(id) {
  return typeof id === 'string' && /^h_[0-9a-z]{1,16}$/.test(id) ? id : null;
}

async function enforceUserDataMutationRateLimit(request) {
  const { success, reset } = await userDataMutationLimiter.check(getClientIp(request));
  return success ? null : rateLimitResponse(reset);
}

export async function GET() {
  try {
    const user = await requireUser();
    const data = (await kv.get(userDataKey(user.id, 'trips'))) || [];
    return Response.json({ trips: data }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const limited = await enforceUserDataMutationRateLimit(request);
    if (limited) return limited;

    const user = await requireUser();
    const body = await request.json();
    const { id, hotelKey, hotelName, city, country, image, checkIn, checkOut, guests, notes } = body || {};
    if (!hotelKey || !hotelName || !checkIn || !checkOut) {
      throw new ValidationError('hotelKey, hotelName, checkIn, checkOut required');
    }
    const ci = parseDate(checkIn, 'checkIn');
    const co = parseDate(checkOut, 'checkOut');
    if (ci >= co) throw new ValidationError('checkIn must be before checkOut');
    const g = Number(guests || 1);
    if (!Number.isInteger(g) || g < 1) throw new ValidationError('guests must be a positive integer');

    const existing = (await kv.get(userDataKey(user.id, 'trips'))) || [];
    const createdAt = new Date().toISOString();
    const trip = {
      id: validClientTripId(id) || hashId('trip', user.id, hotelKey, checkIn, checkOut, g, notes || ''),
      hotelKey,
      hotelName,
      city: city || '',
      country: country || '',
      image: image || '',
      checkIn,
      checkOut,
      guests: g,
      notes: notes ? String(notes).slice(0, 280) : undefined,
      createdAt,
    };
    const next = [trip, ...existing];
    await kv.set(userDataKey(user.id, 'trips'), next);
    return Response.json({ trip, trips: next }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request) {
  try {
    assertSameOrigin(request);
    const limited = await enforceUserDataMutationRateLimit(request);
    if (limited) return limited;

    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new ValidationError('id query param required');
    const existing = (await kv.get(userDataKey(user.id, 'trips'))) || [];
    const next = existing.filter((t) => t.id !== id);
    await kv.set(userDataKey(user.id, 'trips'), next);
    return Response.json({ trips: next }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return errorResponse(err);
  }
}
