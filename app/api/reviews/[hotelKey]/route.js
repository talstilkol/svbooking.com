import { getUnavailableReviewSummary } from '@/lib/reviews';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(_request, { params }) {
  try {
    const { hotelKey } = await params;
    const summary = getUnavailableReviewSummary(hotelKey);
    if (!summary) {
      return Response.json({ error: 'Hotel not found' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    return Response.json(summary, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/reviews/[hotelKey] error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
