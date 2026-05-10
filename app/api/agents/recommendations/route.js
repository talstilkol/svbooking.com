import { getRates } from '@/lib/xotelo';
import { HOTELS, findHotel } from '@/lib/hotels-catalog';

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function checkPriceForHotel(hotelKey, checkIn, checkOut) {
  try {
    const result = await getRates({ hotelKey, checkIn, checkOut });
    const rates = (result?.rates || [])
      .map((r) => ({ provider: r.name, total: Number(r.rate || 0) + Number(r.tax || 0) }))
      .filter((r) => r.total > 0)
      .sort((a, b) => a.total - b.total);
    return rates.length > 0 ? rates[0] : null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { favorites = [], trips = [] } = body;

    const recommendations = [];
    const today = new Date().toISOString().split('T')[0];

    for (const trip of trips.slice(0, 3)) {
      if (!trip.hotelKey || !trip.checkIn || !trip.checkOut) continue;
      if (trip.checkIn < today) continue;

      const hotel = findHotel(trip.hotelKey);
      if (!hotel) continue;

      const currentPrice = await checkPriceForHotel(trip.hotelKey, trip.checkIn, trip.checkOut);
      if (!currentPrice) continue;

      const altCheckIn = addDays(trip.checkIn, -3);
      const altCheckOut = addDays(trip.checkOut, -3);
      if (altCheckIn >= today) {
        const altPrice = await checkPriceForHotel(trip.hotelKey, altCheckIn, altCheckOut);
        if (altPrice && altPrice.total < currentPrice.total * 0.9) {
          const savingsPct = Math.round(((currentPrice.total - altPrice.total) / currentPrice.total) * 100);
          recommendations.push({
            type: 'timing_suggestion',
            title: `Save ${savingsPct}% on ${hotel.name}`,
            description: `Moving your trip 3 days earlier saves $${(currentPrice.total - altPrice.total).toFixed(0)} (${altCheckIn} to ${altCheckOut})`,
            hotel,
            action: { label: 'Compare Dates', href: `/compare?hotelKey=${hotel.hotelKey}&checkIn=${altCheckIn}&checkOut=${altCheckOut}` },
            priority: savingsPct >= 20 ? 'high' : 'medium',
          });
        }
      }
    }

    for (const fav of favorites.slice(0, 3)) {
      if (!fav.hotelKey) continue;
      const hotel = findHotel(fav.hotelKey);
      if (!hotel) continue;

      const checkIn = addDays(today, 14);
      const checkOut = addDays(today, 16);
      const price = await checkPriceForHotel(fav.hotelKey, checkIn, checkOut);
      if (price) {
        recommendations.push({
          type: 'new_deal',
          title: `${hotel.name} from $${price.total.toFixed(0)}/2 nights`,
          description: `Your favorited hotel in ${hotel.city} is available via ${price.provider} — check if it fits your schedule`,
          hotel,
          action: { label: 'View Deal', href: `/compare?hotelKey=${hotel.hotelKey}&checkIn=${checkIn}&checkOut=${checkOut}` },
          priority: 'medium',
        });
      }
    }

    if (favorites.length > 0) {
      const favCountries = [...new Set(favorites.map((f) => f.country).filter(Boolean))];
      for (const country of favCountries.slice(0, 1)) {
        const hotelsInCountry = HOTELS.filter(
          (h) => h.country === country && !favorites.some((f) => f.hotelKey === h.hotelKey)
        );
        if (hotelsInCountry.length > 0) {
          const suggest = hotelsInCountry[0];
          recommendations.push({
            type: 'similar_hotel',
            title: `Discover ${suggest.name}`,
            description: `Since you like hotels in ${country}, check out ${suggest.name} in ${suggest.city}`,
            hotel: suggest,
            action: { label: 'Explore', href: `/compare?hotelKey=${suggest.hotelKey}&checkIn=${addDays(today, 14)}&checkOut=${addDays(today, 16)}` },
            priority: 'low',
          });
        }
      }
    }

    recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });

    return Response.json({
      recommendations: recommendations.slice(0, 8),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('POST /api/agents/recommendations error:', err);
    return Response.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
