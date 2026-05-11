import { searchHotels, listCities } from '@/lib/hotels-catalog';

// GET /api/search?q=par
// Returns matching cities + hotels for autocomplete
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();

  if (!q || q.length < 1) {
    return Response.json({ cities: [], hotels: [] });
  }

  const allCities = listCities();
  const matchingCities = allCities
    .filter((c) => c.toLowerCase().includes(q))
    .slice(0, 5);

  const matchingHotels = searchHotels(q).map((h) => ({
    hotelKey: h.hotelKey,
    name: h.name,
    city: h.city,
    country: h.country,
    image: h.image,
  }));

  return Response.json(
    { cities: matchingCities, hotels: matchingHotels },
    { headers: { 'Cache-Control': 'public, s-maxage=60' } }
  );
}
