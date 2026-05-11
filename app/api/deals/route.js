import { getRates, getHeatmap } from '@/lib/xotelo';
import { HOTELS, getHotelsByCity, getHotelsByCountry, getHotelsByCities, findHotel } from '@/lib/hotels-catalog';
import { CONTINENTS } from '@/lib/destinations';

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

async function fetchDealForHotel(hotel, checkIn, checkOut) {
  try {
    const result = await getRates({ hotelKey: hotel.hotelKey, checkIn, checkOut });
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
      getHeatmap({ hotelKey, checkOut: checkOutStr })
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

    // Price trend mode for a single hotel
    if (hotelKey) {
      const hotel = findHotel(hotelKey);
      const trend = await buildPriceTrend(hotelKey, nights).catch(() => []);
      return Response.json(
        { hotel, trend },
        { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
      );
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

    const dates = checkIn && checkOut ? { checkIn, checkOut } : getDefaultDates();

    const tasks = hotels.slice(0, limit).map((hotel) =>
      fetchDealForHotel(hotel, dates.checkIn, dates.checkOut)
    );

    const results = await Promise.allSettled(tasks);

    const deals = results
      .filter((r) => r.status === 'fulfilled' && r.value !== null)
      .map((r) => r.value)
      .sort((a, b) => a.pricePerNight - b.pricePerNight);

    return Response.json({
      deals,
      filter: { continent: continent || null, country: country || null, city: city || null },
      dates,
      totalHotelsScanned: hotels.length,
    });
  } catch (err) {
    console.error('GET /api/deals error:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
