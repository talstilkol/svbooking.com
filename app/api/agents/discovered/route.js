import { kv } from '@/lib/kv';
import { listCities, findHotel, addDiscoveredHotel, getCatalogStats } from '@/lib/hotels-catalog';

/**
 * GET /api/agents/discovered
 * Returns all hotels discovered by the discovery agent across all cities.
 *
 * Optional query params:
 *   ?city=Paris  — filter by city
 *   ?stats=true  — also return catalog stats
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityFilter = searchParams.get('city');
    const includeStats = searchParams.get('stats') === 'true';

    // Get all discovered:hotels:* keys from KV
    const discoveredKeys = await kv.keys('discovered:hotels:*');

    const allDiscovered = [];
    if (discoveredKeys.length > 0) {
      const values = await kv.mget(discoveredKeys);
      for (let i = 0; i < discoveredKeys.length; i++) {
        const cityName = discoveredKeys[i].replace('discovered:hotels:', '');
        const hotels = values[i];
        if (!Array.isArray(hotels)) continue;
        for (const hotel of hotels) {
          const alreadyInCatalog = Boolean(findHotel(hotel.hotelKey));
          allDiscovered.push({
            ...hotel,
            discoveredForCity: cityName,
            alreadyInCatalog,
          });
        }
      }
    }

    // Apply city filter
    const filtered = cityFilter
      ? allDiscovered.filter(
          (h) => h.discoveredForCity.toLowerCase() === cityFilter.toLowerCase() ||
                 h.city?.toLowerCase() === cityFilter.toLowerCase()
        )
      : allDiscovered;

    // Sort: new (not in catalog) first, then by city
    filtered.sort((a, b) => {
      if (a.alreadyInCatalog !== b.alreadyInCatalog) return a.alreadyInCatalog ? 1 : -1;
      return (a.city || '').localeCompare(b.city || '');
    });

    const response = {
      total: filtered.length,
      newHotels: filtered.filter((h) => !h.alreadyInCatalog).length,
      existingHotels: filtered.filter((h) => h.alreadyInCatalog).length,
      citiesScanned: discoveredKeys.length,
      hotels: filtered,
    };

    if (includeStats) {
      response.catalogStats = getCatalogStats();
    }

    return Response.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error('GET /api/agents/discovered error:', err);
    return Response.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/agents/discovered
 * Add a discovered hotel to the runtime catalog.
 * Body: { hotelKey, name, city, country, stars? }
 * Or: { action: 'add-all' } to add all undiscovered hotels
 */
export async function POST(request) {
  try {
    const body = await request.json();

    // Bulk add all discovered hotels
    if (body.action === 'add-all') {
      const discoveredKeys = await kv.keys('discovered:hotels:*');
      if (discoveredKeys.length === 0) {
        return Response.json({ added: 0, skipped: 0, message: 'No discovered hotels found' });
      }

      const values = await kv.mget(discoveredKeys);
      let added = 0;
      let skipped = 0;

      for (const hotels of values) {
        if (!Array.isArray(hotels)) continue;
        for (const hotel of hotels) {
          if (addDiscoveredHotel(hotel)) {
            added++;
          } else {
            skipped++;
          }
        }
      }

      return Response.json({
        added,
        skipped,
        message: `Added ${added} hotels to runtime catalog (${skipped} already existed)`,
        catalogStats: getCatalogStats(),
      });
    }

    // Single hotel add
    const { hotelKey, name, city, country, stars } = body;
    if (!hotelKey || !name || !city || !country) {
      return Response.json(
        { error: 'Missing required fields: hotelKey, name, city, country' },
        { status: 400 }
      );
    }

    const wasAdded = addDiscoveredHotel({ hotelKey, name, city, country, stars });

    return Response.json({
      added: wasAdded,
      message: wasAdded ? `${name} added to catalog` : `${name} already exists in catalog`,
      catalogStats: getCatalogStats(),
    });
  } catch (err) {
    console.error('POST /api/agents/discovered error:', err);
    return Response.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
