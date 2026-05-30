import { getReviewSummary, getUnavailableReviewSummary } from '@/lib/reviews';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const reviewsLimiter = rateLimit({ namespace: 'reviews', limit: 40, window: 60, failOpen: true });
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request, { params }) {
  const ip = getClientIp(request);
  const { success, reset } = await reviewsLimiter.check(ip);
  if (!success) return rateLimitResponse(reset);
  try {
    const { hotelKey } = await params;
    const summary = await getReviewSummary(hotelKey) || getUnavailableReviewSummary(hotelKey);
    if (!summary) {
      return Response.json({ error: 'Hotel not found' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    return Response.json(summary, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/reviews/[hotelKey] error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
