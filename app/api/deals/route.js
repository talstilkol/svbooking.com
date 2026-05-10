import { getRates } from '@/lib/xotelo';
import { HOTELS, getHotelsByCity, getHotelsByCountry, getHotelsByCities } from '@/lib/hotels-catalog';
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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const continent = searchParams.get('continent');
    const country = searchParams.get('country');
    const city = searchParams.get('city');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const limit = Math.min(Number(searchParams.get('limit') || '10'), 15);

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
