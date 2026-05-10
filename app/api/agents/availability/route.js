import { findHotel } from '@/lib/hotels-catalog';

const BOOKING_SEARCH_URL = 'https://www.booking.com/searchresults.html';
const GOOGLE_HOTELS_URL = 'https://www.google.com/travel/hotels';

function buildBookingUrl(hotelName, city, checkIn, checkOut) {
  const query = `${hotelName} ${city}`;
  const params = new URLSearchParams({
    ss: query,
    checkin: checkIn,
    checkout: checkOut,
    no_rooms: '1',
    group_adults: '2',
  });
  return `${BOOKING_SEARCH_URL}?${params}`;
}

function buildGoogleHotelsUrl(hotelName, city, checkIn, checkOut) {
  const params = new URLSearchParams({
    q: `${hotelName} ${city}`,
    dates: `${checkIn},${checkOut}`,
  });
  return `${GOOGLE_HOTELS_URL}?${params}`;
}

function buildExpediaUrl(hotelName, city, checkIn, checkOut) {
  const params = new URLSearchParams({
    destination: `${hotelName} ${city}`,
    startDate: checkIn,
    endDate: checkOut,
  });
  return `https://www.expedia.com/Hotel-Search?${params}`;
}

function buildAgodaUrl(city, checkIn, checkOut) {
  const params = new URLSearchParams({
    city: city,
    checkIn: checkIn,
    checkOut: checkOut,
  });
  return `https://www.agoda.com/search?${params}`;
}

async function checkAvailabilityViaFetch(url, providerName) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SVBookingBot/1.0; hotel-availability-check)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);
    const status = res.status;
    const redirected = res.redirected;
    const finalUrl = res.url;

    const available = status === 200;
    const htmlSize = available ? (await res.text()).length : 0;
    const hasContent = htmlSize > 5000;

    return {
      provider: providerName,
      url,
      status,
      available: available && hasContent,
      redirected,
      finalUrl: redirected ? finalUrl : undefined,
      responseSize: htmlSize,
      note: !available ? `HTTP ${status}` : !hasContent ? 'Empty response (may be blocked)' : 'Reachable',
    };
  } catch (err) {
    clearTimeout(timeout);
    return {
      provider: providerName,
      url,
      status: 0,
      available: false,
      error: err instanceof Error ? err.name : 'Unknown error',
      note: err instanceof Error && err.name === 'AbortError' ? 'Timeout (8s)' : 'Connection failed',
    };
  }
}

// GET /api/agents/availability?hotelKey=...&checkIn=...&checkOut=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelKey = searchParams.get('hotelKey');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');

    if (!hotelKey || !checkIn || !checkOut) {
      return Response.json(
        { error: 'hotelKey, checkIn, and checkOut are required' },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(checkIn) < today) {
      return Response.json({ error: 'checkIn must be today or later' }, { status: 400 });
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      return Response.json({ error: 'checkOut must be after checkIn' }, { status: 400 });
    }

    const hotel = findHotel(hotelKey);
    if (!hotel) {
      return Response.json({ error: 'Hotel not found in catalog' }, { status: 404 });
    }

    const urls = [
      { name: 'Booking.com', url: buildBookingUrl(hotel.name, hotel.city, checkIn, checkOut) },
      { name: 'Google Hotels', url: buildGoogleHotelsUrl(hotel.name, hotel.city, checkIn, checkOut) },
      { name: 'Expedia', url: buildExpediaUrl(hotel.name, hotel.city, checkIn, checkOut) },
      { name: 'Agoda', url: buildAgodaUrl(hotel.city, checkIn, checkOut) },
    ];

    const checks = await Promise.allSettled(
      urls.map(({ name, url }) => checkAvailabilityViaFetch(url, name))
    );

    const results = checks.map((result, i) => {
      if (result.status === 'fulfilled') return result.value;
      return {
        provider: urls[i].name,
        url: urls[i].url,
        status: 0,
        available: false,
        error: 'Promise rejected',
        note: 'Check failed',
      };
    });

    const reachableCount = results.filter((r) => r.available).length;
    const summary = reachableCount > 0
      ? `${reachableCount} of ${results.length} booking sites are reachable for ${hotel.name}`
      : `No booking sites returned results (they may be blocking server-side requests)`;

    return Response.json({
      hotel: { name: hotel.name, city: hotel.city, country: hotel.country, hotelKey },
      dates: { checkIn, checkOut },
      results,
      summary,
      bookingLinks: urls.map((u) => ({ provider: u.name, url: u.url })),
      note: 'This agent checks if booking sites are reachable with your search. For actual availability and pricing, use the Compare feature which queries Xotelo API.',
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
