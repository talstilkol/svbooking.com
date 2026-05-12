import { getForecast, getMonthlyAverages } from '@/lib/weather';
import { CITY_COORDINATES } from '@/lib/city-coordinates';

/**
 * GET /api/weather?city=Paris
 * GET /api/weather?lat=48.8566&lon=2.3522
 * GET /api/weather?city=Paris&mode=monthly&month=7
 *
 * Returns weather forecast or historical averages for a destination.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const mode = searchParams.get('mode') || 'forecast';
    const units = searchParams.get('units') || 'celsius';
    let lat = searchParams.get('lat') ? Number(searchParams.get('lat')) : null;
    let lon = searchParams.get('lon') ? Number(searchParams.get('lon')) : null;

    // Resolve city name to coordinates (CITY_COORDINATES is an array with .lng)
    if (city && (!lat || !lon)) {
      const match = CITY_COORDINATES.find(
        (c) => c.city.toLowerCase() === city.toLowerCase()
      );
      if (match) {
        lat = match.lat;
        lon = match.lng;
      }
    }

    if (!lat || !lon) {
      return Response.json(
        { error: 'Provide city name or lat/lon coordinates' },
        { status: 400 }
      );
    }

    if (mode === 'monthly') {
      const month = Number(searchParams.get('month') || new Date().getMonth() + 1);
      const averages = await getMonthlyAverages({ lat, lon, month });
      return Response.json({ city, ...averages }, {
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800' },
      });
    }

    const days = Math.min(Number(searchParams.get('days') || '7'), 16);
    const forecast = await getForecast({ lat, lon, units, days });
    return Response.json({ city, ...forecast }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
