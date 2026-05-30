// IP Geolocation — free, no auth required.
// Detects user's country, city, coordinates, and local currency.
// Used for auto-selecting nearby destinations and default currency.
//
// Primary: ip-api.com (free, 45 req/min)
// Fallback: ipapi.co (free, 1000/day)

import { haversineKm } from './utils/geo-distance';

/**
 * Detect user's location from their IP address.
 * Works on server-side by reading the client IP from request headers.
 *
 * @param {string} [ip] - IP address to look up (null = caller's IP)
 * @returns {Promise<{country, countryCode, city, lat, lon, currency, timezone, isp?}>}
 */
export async function detectLocation(ip) {
  // Try primary source
  try {
    const url = ip
      ? `http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,lat,lon,currency,timezone,isp`
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
    const url = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/';
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
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = request.headers.get('x-real-ip');
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
