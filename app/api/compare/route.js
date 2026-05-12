import { getHotelRates } from '@/lib/hotel-pricing';
import { HOTELS, listCities, getHotelsByCity, findHotel, getFullCatalog } from '@/lib/hotels-catalog';
import { kv } from '@/lib/kv';

// GET /api/compare
//   ?city=Paris                                      -> list hotels in city
//   ?hotelKey=g187147-d188728&checkIn=...&checkOut=...  -> compare prices across OTAs
//   (no params)                                      -> list all cities + all hotels
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const hotelKey = searchParams.get('hotelKey');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const currency = searchParams.get('currency') || 'USD';

    // Mode 1: compare prices for a specific hotel
    if (hotelKey) {
      // If no dates, return just hotel catalog info (for detail page header)
      if (!checkIn || !checkOut) {
        const hotel = findHotel(hotelKey);
        if (!hotel) return Response.json({ error: 'Hotel not found' }, { status: 404 });
        return Response.json({ hotel }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
      }

      // Check price cache first (30-minute TTL)
      const cacheKey = `compare:${hotelKey}:${checkIn}:${checkOut}:${currency}`;
      try {
        const cached = await kv.get(cacheKey);
        if (cached) {
          return Response.json(
            { ...cached, fromCache: true },
            { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
          );
        }
      } catch { /* cache miss */ }

      const hotel = findHotel(hotelKey);
      const result = await getHotelRates({
        hotelKey,
        hotelName: hotel?.name,
        city: hotel?.city,
        checkIn,
        checkOut,
        currency,
      });
      const rates = (result?.rates || [])
        .map((r) => ({
          provider: r.name,
          code: r.code,
          rate: Number(r.rate || 0),
          tax: Number(r.tax || 0),
          total: Number(r.rate || 0) + Number(r.tax || 0),
          currency: result.currency || currency,
        }))
        .sort((a, b) => a.total - b.total);

      const cheapest = rates[0] || null;
      const mostExpensive = rates[rates.length - 1] || null;
      const savingsPct =
        cheapest && mostExpensive && mostExpensive.total > 0
          ? Math.round(((mostExpensive.total - cheapest.total) / mostExpensive.total) * 100)
          : 0;

      const responseData = {
        hotel: hotel || { hotelKey, name: 'Hotel', city: '', country: '' },
        checkIn: result?.chk_in || checkIn,
        checkOut: result?.chk_out || checkOut,
        currency: result?.currency || currency,
        rates,
        cheapest,
        mostExpensive,
        savingsPct,
        savingsAmount: cheapest && mostExpensive ? Number((mostExpensive.total - cheapest.total).toFixed(2)) : 0,
        providerCount: rates.length,
      };

      // Cache the result (fire-and-forget, 30 min TTL)
      if (rates.length > 0) {
        kv.setWithTTL(cacheKey, responseData, 1800).catch(() => {});

        // Store price snapshot for history (fire-and-forget)
        if (cheapest) {
          (async () => {
            try {
              const snapshot = {
                date: new Date().toISOString().split('T')[0],
                price: cheapest.total,
                provider: cheapest.provider,
              };
              const historyKey = `price-history:${hotelKey}`;
              const history = (await kv.get(historyKey)) || [];
              // Dedup: only one entry per day
              if (!history.length || history[history.length - 1].date !== snapshot.date) {
                history.push(snapshot);
                const trimmed = history.slice(-90); // keep last 90 days
                await kv.setWithTTL(historyKey, trimmed, 90 * 86400);
              }
            } catch { /* non-critical */ }
          })();
        }
      }

      return Response.json(
        responseData,
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
      );
    }

    // Mode 2: list hotels in a city (static catalog data)
    if (city) {
      return Response.json(
        { city, hotels: getHotelsByCity(city) },
        { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } }
      );
    }

    // Mode 3: catalog (cacheable for 5 minutes) — includes KV-discovered hotels
    const fullCatalog = await getFullCatalog();
    return Response.json(
      { cities: listCities(), hotels: fullCatalog },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err) {
    console.error('GET /api/compare error:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
