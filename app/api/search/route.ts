import { searchHotels, listCities, listCountries } from '@/lib/hotels-catalog';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const searchLimiter = rateLimit({ namespace: 'search', limit: 60, window: 60, failOpen: true });

interface SearchHotel {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  image: string;
}

// GET /api/search?q=par
// Returns matching cities, countries, + hotels for autocomplete
// Uses fuzzy search with field-weighted ranking
export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const { success, reset } = await searchLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    if (!q || q.length < 1) {
      return Response.json({ cities: [], countries: [], hotels: [] });
    }

    const allCities = listCities();
    const allCountries = listCountries();

    // Cities: exact matches first, then startsWith, then includes
    const matchingCities = allCities
      .filter((c) => c.toLowerCase().includes(q))
      .sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        // Exact start match gets priority
        const aStart = aLower.startsWith(q) ? 0 : 1;
        const bStart = bLower.startsWith(q) ? 0 : 1;
        return aStart - bStart || a.localeCompare(b);
      })
      .slice(0, 5);

    // Countries: same logic
    const matchingCountries = allCountries
      .filter((c) => c.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStart = a.toLowerCase().startsWith(q) ? 0 : 1;
        const bStart = b.toLowerCase().startsWith(q) ? 0 : 1;
        return aStart - bStart || a.localeCompare(b);
      })
      .slice(0, 3);

    // Hotels: uses fuzzy search with field-weighted ranking
    const matchingHotels = (searchHotels(q) as SearchHotel[]).map((h) => ({
      hotelKey: h.hotelKey,
      name: h.name,
      city: h.city,
      country: h.country,
      image: h.image,
    }));

    return Response.json(
      { cities: matchingCities, countries: matchingCountries, hotels: matchingHotels },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err) {
    console.error('GET /api/search error:', err);
    return Response.json(
      { error: 'Search unavailable', cities: [], countries: [], hotels: [] },
      { status: 500 }
    );
  }
}
