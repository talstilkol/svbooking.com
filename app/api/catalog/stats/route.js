import { getCatalogStats } from '@/lib/hotels-catalog';
import { rateLimit } from '@/lib/rate-limit';

/**
 * GET /api/catalog/stats
 * Returns live catalog statistics including dynamically added hotels.
 * Heavily cached since catalog changes are infrequent.
 */
export async function GET(request) {
  const rl = await rateLimit({ namespace: 'catalog-stats', limit: 30, window: 60, request, failOpen: true });
  if (rl?.limited) {
    return Response.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }
  const stats = getCatalogStats();

  return Response.json(stats, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' },
  });
}
