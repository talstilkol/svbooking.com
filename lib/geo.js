// IP Geolocation — free, no auth required.
// Detects user's country, city, coordinates, and local currency.
// Used for auto-selecting nearby destinations and default currency.
//
// Primary: ip-api.com (free, 45 req/min)
// Fallback: ipapi.co (free, 1000/day)

import { haversineKm } from './utils/geo-distance';

function firstHeaderValue(value) {
  return String(value || '').split(',')[0].trim();
}

function isValidIpv4(value) {
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const parsed = Number(part);
    return parsed >= 0 && parsed <= 255;
  });
}

function isValidIpv6(value) {
  if (!value.includes(':') || !/^[0-9a-f:]+$/i.test(value)) return false;
  if ((value.match(/::/g) || []).length > 1) return false;

  const groups = value.split(':');
  const populatedGroups = groups.filter(Boolean);
  if (populatedGroups.some((group) => group.length > 4)) return false;

  return value.includes('::')
    ? populatedGroups.length <= 8
    : populatedGroups.length === 8;
}

function normalizeClientIp(value) {
  const raw = firstHeaderValue(value);
  if (!raw || raw.toLowerCase() === 'unknown') return null;

  let candidate = raw;
  if (candidate.startsWith('[')) {
    const bracketEnd = candidate.indexOf(']');
    candidate = bracketEnd > 0 ? candidate.slice(1, bracketEnd) : candidate;
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    candidate = candidate.slice(0, candidate.lastIndexOf(':'));
  }

  candidate = candidate.replace(/^::ffff:/i, '');

  if (isValidIpv4(candidate)) return candidate;
  if (isValidIpv6(candidate)) return candidate.toLowerCase();
  return null;
}

/**
 * Detect user's location from their IP address.
 * Works on server-side by reading the client IP from request headers.
 *
 * @param {string} [ip] - IP address to look up (null = caller's IP)
 * @returns {Promise<{country, countryCode, city, lat, lon, currency, timezone, isp?}>}
 */
export async function detectLocation(ip) {
  const lookupIp = ip ? normalizeClientIp(ip) : null;
  if (ip && !lookupIp) return null;

  // Try primary source
  try {
    const url = lookupIp
      ? `http://ip-api.com/json/${encodeURIComponent(lookupIp)}?fields=status,country,countryCode,city,lat,lon,currency,timezone,isp`
      : 'http://ip-api.com/json/?fields=status,country,countryCode,city,lat,lon,currency,timezone,isp';

    const data = await fetchWithTimeout(url, 5000);
    if (data?.status === 'success') {
      return {
        country: data.country,
        countryCode: data.countryCode,
        city: data.city,
        lat: data.lat,
        lon: data.lon,
        currency: data.currency || guessCurrency(data.countryCode),
        timezone: data.timezone,
        isp: data.isp,
        source: 'ip-api',
      };
    }
  } catch {
    // Try fallback
  }

  // Fallback
  try {
    const url = lookupIp ? `https://ipapi.co/${encodeURIComponent(lookupIp)}/json/` : 'https://ipapi.co/json/';
    const data = await fetchWithTimeout(url, 5000);
    if (data && !data.error) {
      return {
        country: data.country_name,
        countryCode: data.country_code,
        city: data.city,
        lat: data.latitude,
        lon: data.longitude,
        currency: data.currency || guessCurrency(data.country_code),
        timezone: data.timezone,
        source: 'ipapi',
      };
    }
  } catch {
    // Both failed
  }

  return null;
}

/**
 * Get the client IP from a Next.js request.
 * Checks common proxy headers.
 */
export function getClientIp(request) {
  const cfIp = normalizeClientIp(request.headers.get('cf-connecting-ip'));
  if (cfIp) return cfIp;

  const forwarded = request.headers.get('x-forwarded-for');
  const forwardedIp = normalizeClientIp(forwarded);
  if (forwardedIp) return forwardedIp;

  const realIp = normalizeClientIp(request.headers.get('x-real-ip'));
  if (realIp) return realIp;

  return null;
}

/**
 * Suggest the nearest catalog city based on coordinates.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {Array<{city: string, lat: number, lon: number}>} cities
 * @returns {{ city: string, distance: number } | null}
 */
export function findNearestCity(lat, lon, cities) {
  if (!cities?.length) return null;

  let nearest = null;
  let minDist = Infinity;

  for (const c of cities) {
    if (typeof c.lat !== 'number' || !Number.isFinite(c.lat) || typeof c.lon !== 'number' || !Number.isFinite(c.lon)) continue;
    const dist = haversineKm(lat, lon, c.lat, c.lon);
    if (dist < minDist) {
      minDist = dist;
      nearest = c;
    }
  }

  return nearest ? { city: nearest.city, distance: Math.round(minDist) } : null;
}

/**
 * Guess currency from country code.
 */
function guessCurrency(cc) {
  const map = {
    US: 'USD', GB: 'GBP', EU: 'EUR', JP: 'JPY', CN: 'CNY',
    IL: 'ILS', TH: 'THB', KR: 'KRW', IN: 'INR', AU: 'AUD',
    CA: 'CAD', CH: 'CHF', SG: 'SGD', HK: 'HKD', NZ: 'NZD',
    SE: 'SEK', NO: 'NOK', DK: 'DKK', MX: 'MXN', BR: 'BRL',
    AE: 'AED', SA: 'SAR', EG: 'EGP', ZA: 'ZAR', TR: 'TRY',
    MY: 'MYR', PH: 'PHP', ID: 'IDR', CO: 'COP', PE: 'PEN',
    AR: 'ARS', LK: 'LKR', KE: 'KES', HR: 'EUR', HU: 'HUF',
    PL: 'PLN', CZ: 'CZK', RO: 'RON', QA: 'QAR', FI: 'EUR',
    // Eurozone
    DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
    PT: 'EUR', GR: 'EUR', AT: 'EUR', BE: 'EUR', IE: 'EUR',
  };
  return map[cc] || 'USD';
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
