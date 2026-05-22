import { getPropertyContent } from '@/lib/property-content';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(_request, { params }) {
  try {
    const { hotelKey } = await params;
    const content = getPropertyContent(hotelKey);
    if (!content) {
      return Response.json({ error: 'Hotel not found' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    return Response.json(content, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/property-content/[hotelKey] error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
