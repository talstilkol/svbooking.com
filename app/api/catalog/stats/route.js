import { getCatalogStats } from '@/lib/hotels-catalog';

/**
 * GET /api/catalog/stats
 * Returns live catalog statistics including dynamically added hotels.
 * Heavily cached since catalog changes are infrequent.
 */
export async function GET() {
  const stats = getCatalogStats();

  return Response.json(stats, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' },
  });
}
