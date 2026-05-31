/**
 * Ticketmaster Discovery API — Live events with dates, venues, and ticket links.
 *
 * Free tier: 5000 calls/day (no credit card required).
 * Requires TICKETMASTER_API_KEY env var (free signup at developer.ticketmaster.com).
 *
 * If no API key is configured, all functions return empty results gracefully.
 */

import { fetchJsonWithTimeout } from './utils/fetch-with-timeout.js';
import { normalizeHttpsUrl } from './utils/public-url-safety';

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RADIUS = 25;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MIN_RADIUS = 1;
const MAX_RADIUS = 250;

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
  radius = DEFAULT_RADIUS,
  limit = DEFAULT_LIMIT,
  timeoutMs = DEFAULT_TIMEOUT,
} = {}) {
  if (!isConfigured()) return [];

  const latitude = normalizeCoordinate(lat, -90, 90);
  const longitude = normalizeCoordinate(lon, -180, 180);
  if (latitude === null || longitude === null) return [];

  const boundedRadius = normalizePositiveInteger(radius, DEFAULT_RADIUS, MIN_RADIUS, MAX_RADIUS);
  const boundedLimit = normalizePositiveInteger(limit, DEFAULT_LIMIT, 1, MAX_LIMIT);

  const apiKey = process.env.TICKETMASTER_API_KEY;
  const params = new URLSearchParams({
    apikey: apiKey,
    latlong: `${latitude},${longitude}`,
    radius: String(boundedRadius),
    unit: 'miles',
    size: String(boundedLimit),
    sort: 'date,asc',
  });

  if (isIsoDate(startDate)) {
    params.set('startDateTime', `${startDate}T00:00:00Z`);
  }
  if (isIsoDate(endDate)) {
    params.set('endDateTime', `${endDate}T23:59:59Z`);
  }

  const url = `${BASE_URL}/events.json?${params}`;

  try {
    const data = await fetchWithTimeout(url, timeoutMs);
    if (!data || !data._embedded || !data._embedded.events) return [];

    return data._embedded.events
      .map(mapEvent)
      .filter(Boolean)
      .slice(0, boundedLimit);
  } catch {
    return [];
  }
}

function normalizeCoordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function normalizePositiveInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const integer = Math.trunc(number);
  if (integer < min) return min;
  if (integer > max) return max;
  return integer;
}

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/**
 * Map Ticketmaster event to our LocalEvent-compatible interface.
 */
function mapEvent(event) {
  const name = cleanText(event.name);
  if (!name) return null;

  // Date
  const dateInfo = event.dates?.start;
  const dateStr = isIsoDate(dateInfo?.localDate) ? dateInfo.localDate : '';
  const month = dateStr ? formatMonth(dateStr) : '';

  // Icon from segment/genre
  const segment = cleanText(event.classifications?.[0]?.segment?.name) || '';
  const genre = cleanText(event.classifications?.[0]?.genre?.name) || '';
  const icon = getEventIcon(segment, genre);

  // Venue
  const venue = cleanText(event._embedded?.venues?.[0]?.name) || '';

  // Price range
  let priceRange = '';
  if (event.priceRanges && event.priceRanges.length > 0) {
    const pr = event.priceRanges[0];
    const currency = cleanText(pr.currency) || 'USD';
    const min = normalizeNonNegativeNumber(pr.min);
    const max = normalizeNonNegativeNumber(pr.max);
    if (min !== null && max !== null && min !== max) {
      priceRange = `${currency} ${Math.round(min)}–${Math.round(max)}`;
    } else if (min !== null) {
      priceRange = `From ${currency} ${Math.round(min)}`;
    }
  }

  // Description
  const parts = [venue, priceRange].filter(Boolean);
  const description = parts.join(' · ');

  // Ticket URL
  const ticketUrl = normalizeHttpsUrl(event.url) || '';

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
  if (!isIsoDate(dateStr)) return '';
  const d = new Date(`${dateStr}T00:00:00Z`);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
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
  try {
    return await fetchJsonWithTimeout(url, {
      timeoutMs,
      headers: { Accept: 'application/json' },
    });
  } catch {
    return null;
  }
}

function cleanText(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/\s+/g, ' ');
  return text || null;
}

function normalizeNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
