import { kv } from '@/lib/kv';
import { requireUser } from '@/lib/auth';
import { errorResponse, ValidationError } from '@/lib/validation';

function key(uid) {
  return `user:${uid}:favorites`;
}

export async function GET() {
  try {
    const user = await requireUser();
    const data = (await kv.get(key(user.id))) || [];
    return Response.json({ favorites: data });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { hotelKey, name, city, country, image } = body || {};
    if (!hotelKey || !name) throw new ValidationError('hotelKey and name required');
    const existing = (await kv.get(key(user.id))) || [];
    if (existing.some((f) => f.hotelKey === hotelKey)) {
      return Response.json({ favorites: existing });
    }
    const next = [
      ...existing,
      { hotelKey, name, city: city || '', country: country || '', image: image || '', addedAt: new Date().toISOString() },
    ];
    await kv.set(key(user.id), next);
    return Response.json({ favorites: next });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const hotelKey = searchParams.get('hotelKey');
    if (!hotelKey) throw new ValidationError('hotelKey query param required');
    const existing = (await kv.get(key(user.id))) || [];
    const next = existing.filter((f) => f.hotelKey !== hotelKey);
    await kv.set(key(user.id), next);
    return Response.json({ favorites: next });
  } catch (err) {
    return errorResponse(err);
  }
}
