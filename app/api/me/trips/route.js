import { kv } from '@/lib/kv';
import { requireUser } from '@/lib/auth';
import { errorResponse, ValidationError, parseDate } from '@/lib/validation';

function key(uid) {
  return `user:${uid}:trips`;
}

export async function GET() {
  try {
    const user = await requireUser();
    const data = (await kv.get(key(user.id))) || [];
    return Response.json({ trips: data });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { hotelKey, hotelName, city, country, image, checkIn, checkOut, guests, notes } = body || {};
    if (!hotelKey || !hotelName || !checkIn || !checkOut) {
      throw new ValidationError('hotelKey, hotelName, checkIn, checkOut required');
    }
    const ci = parseDate(checkIn, 'checkIn');
    const co = parseDate(checkOut, 'checkOut');
    if (ci >= co) throw new ValidationError('checkIn must be before checkOut');
    const g = Number(guests || 1);
    if (!Number.isInteger(g) || g < 1) throw new ValidationError('guests must be a positive integer');

    const existing = (await kv.get(key(user.id))) || [];
    const trip = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      hotelKey,
      hotelName,
      city: city || '',
      country: country || '',
      image: image || '',
      checkIn,
      checkOut,
      guests: g,
      notes: notes ? String(notes).slice(0, 280) : undefined,
      createdAt: new Date().toISOString(),
    };
    const next = [trip, ...existing];
    await kv.set(key(user.id), next);
    return Response.json({ trip, trips: next });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new ValidationError('id query param required');
    const existing = (await kv.get(key(user.id))) || [];
    const next = existing.filter((t) => t.id !== id);
    await kv.set(key(user.id), next);
    return Response.json({ trips: next });
  } catch (err) {
    return errorResponse(err);
  }
}
