/**
 * Ticketmaster Discovery API — Live events with dates, venues, and ticket links.
 *
 * Free tier: 5000 calls/day (no credit card required).
 * Requires TICKETMASTER_API_KEY env var (free signup at developer.ticketmaster.com).
 *
 * If no API key is configured, all functions return empty results gracefully.
 */

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';
const DEFAULT_TIMEOUT = 10000;

/**
 * Check if Ticketmaster API is configured.
 */
export function isConfigured() {
  return !!process.env.TICKETMASTER_API_KEY;
}

/**
 * Get upcoming events near a location.
 *
 * @param {Object} opts
 * @param {number} opts.lat - Latitude
 * @param {number} opts.lon - Longitude
 * @param {string} [opts.startDate] - ISO date string (YYYY-MM-DD)
 * @param {string} [opts.endDate] - ISO date string (YYYY-MM-DD)
 * @param {number} [opts.radius=25] - Search radius in miles
 * @param {number} [opts.limit=10] - Max results
 * @param {number} [opts.timeoutMs=10000]
 * @returns {Promise<Array<{name: string, month: string, icon: string, description: string, date?: string, priceRange?: string, ticketUrl?: string, venue?: string}>>}
 */
export async function getEvents({
  lat,
  lon,
  startDate,
  endDate,
  radius = 25,
  limit = 10,
  timeoutMs = DEFAULT_TIMEOUT,
} = {}) {
  if (!isConfigured()) return [];

  const apiKey = process.env.TICKETMASTER_API_KEY;
  const params = new URLSearchParams({
    apikey: apiKey,
    latlong: `${lat},${lon}`,
    radius: String(radius),
    unit: 'miles',
    size: String(Math.min(limit, 50)),
    sort: 'date,asc',
  });

  if (startDate) {
    params.set('startDateTime', `${startDate}T00:00:00Z`);
  }
  if (endDate) {
    params.set('endDateTime', `${endDate}T23:59:59Z`);
  }

  const url = `${BASE_URL}/events.json?${params}`;

  try {
    const data = await fetchWithTimeout(url, timeoutMs);
    if (!data || !data._embedded || !data._embedded.events) return [];

    return data._embedded.events.map(mapEvent).slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Map Ticketmaster event to our LocalEvent-compatible interface.
 */
function mapEvent(event) {
  const name = event.name || 'Unnamed Event';

  // Date
  const dateInfo = event.dates?.start;
  const dateStr = dateInfo?.localDate || '';
  const month = dateStr ? formatMonth(dateStr) : '';

  // Icon from segment/genre
  const segment = event.classifications?.[0]?.segment?.name || '';
  const genre = event.classifications?.[0]?.genre?.name || '';
  const icon = getEventIcon(segment, genre);

  // Venue
  const venue = event._embedded?.venues?.[0]?.name || '';

  // Price range
  let priceRange = '';
  if (event.priceRanges && event.priceRanges.length > 0) {
    const pr = event.priceRanges[0];
    const currency = pr.currency || 'USD';
    if (pr.min && pr.max && pr.min !== pr.max) {
      priceRange = `${currency} ${Math.round(pr.min)}–${Math.round(pr.max)}`;
    } else if (pr.min) {
      priceRange = `From ${currency} ${Math.round(pr.min)}`;
    }
  }

  // Description
  const parts = [venue, priceRange].filter(Boolean);
  const description = parts.join(' · ') || 'Live event';

  // Ticket URL
  const ticketUrl = event.url || '';

  return {
    name,
    month,
    icon,
    description,
    date: dateStr,
    priceRange,
    ticketUrl,
    venue,
  };
}

/**
 * Format ISO date to display month (e.g., "Jul 12").
 */
function formatMonth(dateStr) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  } catch {
    return '';
  }
}

/**
 * Map Ticketmaster segment/genre to an emoji icon.
 */
function getEventIcon(segment, genre) {
  const seg = segment.toLowerCase();
  const gen = genre.toLowerCase();

  if (seg === 'music') return '🎵';
  if (seg === 'sports') {
    if (gen.includes('football') || gen.includes('soccer')) return '⚽';
    if (gen.includes('basketball')) return '🏀';
    if (gen.includes('baseball')) return '⚾';
    if (gen.includes('tennis')) return '🎾';
    if (gen.includes('hockey')) return '🏒';
    if (gen.includes('golf')) return '⛳';
    if (gen.includes('boxing') || gen.includes('mma') || gen.includes('wrestling')) return '🥊';
    return '🏟️';
  }
  if (seg === 'arts & theatre' || seg === 'arts') return '🎭';
  if (seg === 'film') return '🎬';
  if (gen.includes('comedy') || gen.includes('stand-up')) return '😂';
  if (gen.includes('family') || gen.includes('disney')) return '👨‍👩‍👧‍👦';
  if (gen.includes('circus')) return '🎪';

  return '🎫';
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}
