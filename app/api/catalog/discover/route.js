import { discoverHotels } from '@/lib/wikidata';
import { HOTELS } from '@/lib/hotels-catalog';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const discoveryLimiter = rateLimit({ namespace: 'catalog-discover', limit: 10, window: 60, failOpen: false });
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

/**
 * GET /api/catalog/discover?country=France&city=Paris&limit=50
 *
 * Discovers new hotels from Wikidata that aren't in the current catalog.
 * Returns Xotelo-compatible hotel keys ready for validation.
 */
export async function GET(request) {
  try {
    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    const ip = getClientIp(request);
    const { success, reset } = await discoveryLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || undefined;
    const city = searchParams.get('city') || undefined;
    const limit = Math.min(Number(searchParams.get('limit') || '100'), 500);
    const includeExisting = searchParams.get('includeExisting') === 'true';

    // Fetch from Wikidata
    const discovered = await discoverHotels({ country, city, limit });

    // Separate into new and existing
    const existingKeys = new Set(HOTELS.map((h) => h.hotelKey));
    const newHotels = discovered.filter((h) => !existingKeys.has(h.hotelKey));
    const existingHotels = discovered.filter((h) => existingKeys.has(h.hotelKey));

    return Response.json({
      discovered: discovered.length,
      new: newHotels.length,
      alreadyInCatalog: existingHotels.length,
      currentCatalogSize: HOTELS.length,
      hotels: includeExisting ? discovered : newHotels,
      filter: { country: country || null, city: city || null },
    }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/catalog/discover error:', err);
    return Response.json(
      { error: 'Discovery unavailable' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
