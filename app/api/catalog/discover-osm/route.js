import { discoverHotels, countHotels } from '@/lib/overpass';
import { searchHotels } from '@/lib/nominatim';
import { HOTELS } from '@/lib/hotels-catalog';

/**
 * GET /api/catalog/discover-osm?city=Paris&source=overpass&limit=30
 *
 * Discovers hotels using free OpenStreetMap sources (no auth):
 *   - source=overpass (default): Overpass API — bulk city discovery
 *   - source=nominatim: Nominatim — name-based search
 *   - source=count: Just count hotels in a city (fast)
 *
 * Hotels with Wikidata IDs can be cross-referenced to TripAdvisor IDs
 * for pricing via Xotelo.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const source = searchParams.get('source') || 'overpass';
    const limit = Math.min(Number(searchParams.get('limit') || '30'), 100);
    const wikidataOnly = searchParams.get('wikidataOnly') === 'true';

    if (!city) {
      return Response.json({ error: 'city parameter is required' }, { status: 400 });
    }

    // Count-only mode (fast)
    if (source === 'count') {
      const total = await countHotels({ city });
      return Response.json({
        city,
        totalHotels: total,
        source: 'overpass-count',
      });
    }

    let hotels;
    if (source === 'nominatim') {
      hotels = await searchHotels({ city, limit });
    } else {
      hotels = await discoverHotels({ city, limit, wikidataOnly });
    }

    // Identify which have Wikidata IDs (cross-referenceable to TripAdvisor)
    const withWikidata = hotels.filter((h) => h.wikidataId);
    const withStars = hotels.filter((h) => h.stars);
    const withBrand = hotels.filter((h) => h.brand);

    return Response.json({
      city,
      source,
      total: hotels.length,
      withWikidataId: withWikidata.length,
      withStarRating: withStars.length,
      withBrand: withBrand.length,
      currentCatalogSize: HOTELS.length,
      hotels,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    console.error('GET /api/catalog/discover-osm error:', err);
    return Response.json(
      { error: err.message || 'Discovery failed' },
      { status: 500 }
    );
  }
}
