import { HOTELS, getHotelsByCity, getHotelsByCountry, getHotelsByCities, findHotel } from '@/lib/hotels-catalog';
import { CONTINENTS } from '@/lib/destinations';
import { getCachedRates, getCachedHeatmap } from '@/lib/price-cache';
import { kv } from '@/lib/kv';

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  const checkIn = addDays(today, 30);
  const checkOut = addDays(today, 32);
  return { checkIn, checkOut };
}

// Heatmap-based deal finder for dateless queries (faster, covers wide date range)
async function fetchDealViaHeatmap(hotel, defaultNights = 2) {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Two strategic checkout dates: ~2 weeks and ~1 month out
    const checkOutDates = [
      addDays(todayStr, 14 + defaultNights),
      addDays(todayStr, 30 + defaultNights),
    ];

    let bestDeal = null;
    let bestPPN = Infinity;

    for (const checkOutStr of checkOutDates) {
      try {
        const result = await getCachedHeatmap({ hotelKey: hotel.hotelKey, checkOut: checkOutStr });
        if (!result) continue;

        const rates = result.rates || result.data || [];
        if (!Array.isArray(rates)) continue;

        for (const entry of rates) {
          const checkIn = entry.chk_in || entry.date;
          const totalPrice = Number(entry.rate || entry.price || entry.min_rate || 0);
          if (!checkIn || totalPrice <= 0) continue;

          // Only consider future check-in dates
          if (checkIn < todayStr) continue;

          const nights = Math.round(
            (new Date(checkOutStr) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
          );
          // Focus on short stays (1-4 nights) for meaningful deal comparison
          if (nights < 1 || nights > 4) continue;

          const ppn = totalPrice / nights;
          if (ppn < bestPPN) {
            bestPPN = ppn;
            bestDeal = {
              hotel,
              bestPrice: totalPrice,
              pricePerNight: Number(ppn.toFixed(2)),
              bestProvider: 'Best Available',
              checkIn,
              checkOut: checkOutStr,
              nights,
              providerCount: 1,
              currency: 'USD',
            };
          }
        }
      } catch {
        // Skip failed heatmap calls
      }
    }

    return bestDeal;
  } catch {
    return null;
  }
}

// Live rate-based deal finder for queries with specific dates
async function fetchDealForHotel(hotel, checkIn, checkOut) {
  try {
    const result = await getCachedRates({ hotelKey: hotel.hotelKey, checkIn, checkOut });
    const rates = (result?.rates || [])
      .map((r) => ({
        provider: r.name,
        total: Number(r.rate || 0) + Number(r.tax || 0),
      }))
      .filter((r) => r.total > 0)
      .sort((a, b) => a.total - b.total);

    if (rates.length === 0) return null;

    const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));

    return {
      hotel,
      bestPrice: rates[0].total,
      pricePerNight: Number((rates[0].total / nights).toFixed(2)),
      bestProvider: rates[0].provider,
      checkIn,
      checkOut,
      nights,
      providerCount: rates.length,
      currency: 'USD',
    };
  } catch {
    return null;
  }
}

// Build 30-day price trend using heatmap API
async function buildPriceTrend(hotelKey, nights) {
  const today = new Date();
  const trendPoints = [];

  // Sample ~30 checkout dates (every 1 day) from tomorrow to +30 days
  const promises = [];
  for (let i = 1; i <= 30; i++) {
    const checkOut = new Date(today);
    checkOut.setDate(today.getDate() + i + nights);
    const checkOutStr = checkOut.toISOString().split('T')[0];
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + i);
    const checkInStr = checkIn.toISOString().split('T')[0];
    promises.push(
      getCachedHeatmap({ hotelKey, checkOut: checkOutStr })
        .then((result) => {
          if (!result) return null;
          // The heatmap result contains rates for different check-in dates
          const dateKey = checkInStr;
          const rates = result.rates || result.data || [];
          const entry = Array.isArray(rates)
            ? rates.find((r) => r.chk_in === checkInStr || r.date === checkInStr)
            : null;
          const price = entry
            ? Number(entry.rate || entry.price || entry.min_rate || 0) / nights
            : 0;
          if (price <= 0) return null;
          const d = new Date(checkInStr);
          const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return { date: dateKey, price: Math.round(price), label };
        })
        .catch(() => null)
    );
  }

  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) trendPoints.push(r.value);
  }
  return trendPoints.sort((a, b) => a.date.localeCompare(b.date));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const continent = searchParams.get('continent');
    const country = searchParams.get('country');
    const city = searchParams.get('city');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const limit = Math.min(Number(searchParams.get('limit') || '10'), 15);
    const hotelKey = searchParams.get('hotelKey');
    const nights = Math.max(1, Number(searchParams.get('nights') || '1'));
    const hasDates = Boolean(checkIn && checkOut);

    // Price trend mode for a single hotel
    if (hotelKey) {
      const hotel = findHotel(hotelKey);
      const trend = await buildPriceTrend(hotelKey, nights).catch(() => []);
      return Response.json(
        { hotel, trend },
        { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
      );
    }

    // Check for pre-cached deals from the deal scanner agent
    if (!hasDates && !city && !country && !continent) {
      try {
        const cachedDeals = await kv.get('agent:deals:top');
        if (cachedDeals && Array.isArray(cachedDeals) && cachedDeals.length > 0) {
          return Response.json({
            deals: cachedDeals.slice(0, limit),
            filter: { continent: null, country: null, city: null },
            dates: null,
            strategy: 'cached-agent',
            totalHotelsScanned: cachedDeals.length,
          });
        }
      } catch { /* cache miss, proceed with live scan */ }
    }

    // Check for per-city cached deals
    if (!hasDates && city) {
      try {
        const cityDeals = await kv.get(`agent:deals:city:${city.toLowerCase()}`);
        if (cityDeals && Array.isArray(cityDeals) && cityDeals.length > 0) {
          return Response.json({
            deals: cityDeals.slice(0, limit),
            filter: { continent: null, country: null, city },
            dates: null,
            strategy: 'cached-agent',
            totalHotelsScanned: cityDeals.length,
          });
        }
      } catch { /* cache miss */ }
    }

    let hotels = HOTELS;

    if (city) {
      hotels = getHotelsByCity(city);
    } else if (country) {
      hotels = getHotelsByCountry(country);
    } else if (continent) {
      const cont = CONTINENTS.find((c) => c.id === continent);
      if (cont) {
        const cities = cont.countries.flatMap((co) => co.cities);
        hotels = getHotelsByCities(cities);
      }
    }

    // Scan up to 30 hotels for dateless heatmap (fast), or up to limit for dated queries
    const scanLimit = hasDates ? limit : Math.min(hotels.length, 30);
    const tasks = hotels.slice(0, scanLimit).map((hotel) =>
      hasDates
        ? fetchDealForHotel(hotel, checkIn, checkOut)
        : fetchDealViaHeatmap(hotel)
    );

    const results = await Promise.allSettled(tasks);

    const deals = results
      .filter((r) => r.status === 'fulfilled' && r.value !== null)
      .map((r) => r.value)
      .sort((a, b) => a.pricePerNight - b.pricePerNight)
      .slice(0, limit);

    return Response.json(
      {
        deals,
        filter: { continent: continent || null, country: country || null, city: city || null },
        dates: hasDates ? { checkIn, checkOut } : null,
        strategy: hasDates ? 'rates' : 'heatmap',
        totalHotelsScanned: scanLimit,
        scannedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err) {
    console.error('GET /api/deals error:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
