import { discoverHotels, countAvailableHotels } from '@/lib/wikidata';
import { HOTELS, findHotel } from '@/lib/hotels-catalog';

/**
 * GET /api/catalog/discover?country=France&city=Paris&limit=50
 *
 * Discovers new hotels from Wikidata that aren't in the current catalog.
 * Returns Xotelo-compatible hotel keys ready for validation.
 */
export async function GET(request) {
  try {
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
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    console.error('GET /api/catalog/discover error:', err);
    return Response.json(
      { error: err.message || 'Discovery failed' },
      { status: 500 }
    );
  }
}
