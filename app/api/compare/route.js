import { getHotelRates } from '@/lib/hotel-pricing';
import { HOTELS, listCities, getHotelsByCity, findHotel } from '@/lib/hotels-catalog';

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

      return Response.json({
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
      });
    }

    // Mode 2: list hotels in a city
    if (city) {
      return Response.json({
        city,
        hotels: getHotelsByCity(city),
      });
    }

    // Mode 3: catalog (cacheable for 5 minutes)
    return Response.json(
      { cities: listCities(), hotels: HOTELS },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err) {
    console.error('GET /api/compare error:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
