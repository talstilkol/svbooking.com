import { kv } from '@/lib/kv';
import { requireUser } from '@/lib/auth';
import { errorResponse, ValidationError } from '@/lib/validation';
import { userDataKey } from '@/lib/user-data';
import { assertSameOrigin } from '@/lib/request-origin';
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const userDataMutationLimiter = rateLimit({ namespace: 'user-data-mutations', limit: 30, window: 60, failOpen: false });

async function enforceUserDataMutationRateLimit(request) {
  const { success, reset } = await userDataMutationLimiter.check(getClientIp(request));
  return success ? null : rateLimitResponse(reset);
}

export async function GET() {
  try {
    const user = await requireUser();
    const data = (await kv.get(userDataKey(user.id, 'favorites'))) || [];
    return Response.json({ favorites: data }, { headers: NO_STORE_HEADERS });
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
    const { hotelKey, name, city, country, image } = body || {};
    if (!hotelKey || !name) throw new ValidationError('hotelKey and name required');
    const existing = (await kv.get(userDataKey(user.id, 'favorites'))) || [];
    if (existing.some((f) => f.hotelKey === hotelKey)) {
      return Response.json({ favorites: existing }, { headers: NO_STORE_HEADERS });
    }
    const next = [
      ...existing,
      { hotelKey, name, city: city || '', country: country || '', image: image || '', addedAt: new Date().toISOString() },
    ];
    await kv.set(userDataKey(user.id, 'favorites'), next);
    return Response.json({ favorites: next }, { headers: NO_STORE_HEADERS });
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
    const hotelKey = searchParams.get('hotelKey');
    if (!hotelKey) throw new ValidationError('hotelKey query param required');
    const existing = (await kv.get(userDataKey(user.id, 'favorites'))) || [];
    const next = existing.filter((f) => f.hotelKey !== hotelKey);
    await kv.set(userDataKey(user.id, 'favorites'), next);
    return Response.json({ favorites: next }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return errorResponse(err);
  }
}
