// Nager.Date — free public holidays API, no auth required.
// Returns official public holidays for supported country codes.
// Useful for: flagging expensive holiday weekends, travel planning.
// https://date.nager.at/Api
//
// Respect upstream rate limits and cache responses at call sites when possible.

const HOLIDAYS_URL = 'https://date.nager.at/api/v3';

export class HolidayProviderUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'HolidayProviderUnavailableError';
  }
}

/**
 * Get public holidays for a country and year.
 *
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code (e.g., "FR", "US", "JP")
 * @param {number} [year] - Year (defaults to current year)
 * @returns {Promise<Array<{date, name, localName, countryCode, fixed, global, counties?}>>}
 */
export async function getPublicHolidays(countryCode, year) {
  if (!countryCode) throw new Error('Country code is required');
  const y = year || new Date().getFullYear();

  const url = `${HOLIDAYS_URL}/publicholidays/${y}/${countryCode.toUpperCase()}`;
  const data = await fetchWithTimeout(url, 8000);

  return data.map((h) => ({
    date: h.date,
    name: h.name,
    localName: h.localName,
    countryCode: h.countryCode,
    fixed: h.fixed,
    global: h.global,
    types: h.types,
  }));
}

/**
 * Check if any holidays overlap with a date range.
 * Returns holidays that fall within [checkIn, checkOut).
 *
 * @param {string} countryCode
 * @param {string} checkIn - YYYY-MM-DD
 * @param {string} checkOut - YYYY-MM-DD
 * @returns {Promise<Array<{date, name, localName}>>}
 */
export async function getHolidaysInRange(countryCode, checkIn, checkOut) {
  const year = new Date(checkIn).getFullYear();
  const holidays = await getPublicHolidays(countryCode, year);

  // If range spans year boundary, also get next year
  const checkOutYear = new Date(checkOut).getFullYear();
  if (checkOutYear > year) {
    const nextYearHolidays = await getPublicHolidays(countryCode, checkOutYear);
    holidays.push(...nextYearHolidays);
  }

  return holidays.filter((h) => h.date >= checkIn && h.date < checkOut);
}

/**
 * Get upcoming holidays for a country (next 90 days).
 *
 * @param {string} countryCode
 * @returns {Promise<Array<{date, name, localName, daysAway}>>}
 */
export async function getUpcomingHolidays(countryCode) {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  const year = new Date().getFullYear();
  let holidays = await getPublicHolidays(countryCode, year);

  // If we're near year end, also get next year
  if (new Date().getMonth() >= 9) {
    const nextYear = await getPublicHolidays(countryCode, year + 1);
    holidays.push(...nextYear);
  }

  return holidays
    .filter((h) => h.date >= today && h.date <= future)
    .map((h) => ({
      ...h,
      daysAway: Math.ceil((new Date(h.date).getTime() - Date.now()) / 86400000),
    }));
}

/**
 * Map city/country name to ISO 3166-1 alpha-2 code.
 */
export function countryToCode(country) {
  const map = {
    'Israel': 'IL', 'France': 'FR', 'UK': 'GB', 'United Kingdom': 'GB',
    'Italy': 'IT', 'Spain': 'ES', 'Netherlands': 'NL', 'Czech Republic': 'CZ',
    'Czechia': 'CZ', 'Austria': 'AT', 'Turkey': 'TR', 'UAE': 'AE',
    'United Arab Emirates': 'AE', 'USA': 'US', 'United States': 'US',
    'Australia': 'AU', 'Japan': 'JP', 'Thailand': 'TH', 'Indonesia': 'ID',
    'Singapore': 'SG', 'Germany': 'DE', 'Greece': 'GR', 'Egypt': 'EG',
    'India': 'IN', 'South Korea': 'KR', 'Malaysia': 'MY', 'Portugal': 'PT',
    'Brazil': 'BR', 'Kenya': 'KE', 'Finland': 'FI', 'Hungary': 'HU',
    'Croatia': 'HR', 'Saudi Arabia': 'SA', 'Sri Lanka': 'LK', 'Canada': 'CA',
    'Mexico': 'MX', 'Argentina': 'AR', 'Colombia': 'CO', 'Peru': 'PE',
    'China': 'CN', 'Hong Kong': 'HK', 'Taiwan': 'TW', 'Philippines': 'PH',
    'Morocco': 'MA', 'South Africa': 'ZA', 'New Zealand': 'NZ',
    'Sweden': 'SE', 'Norway': 'NO', 'Denmark': 'DK', 'Switzerland': 'CH',
    'Belgium': 'BE', 'Ireland': 'IE', 'Poland': 'PL', 'Romania': 'RO',
    'Qatar': 'QA',
  };
  return map[country] || null;
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) throw new HolidayProviderUnavailableError(`Holidays API HTTP ${res.status}`);
    const body = await res.text();
    if (!body.trim()) throw new HolidayProviderUnavailableError('Holidays API returned an empty response');
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      throw new HolidayProviderUnavailableError('Holidays API returned invalid JSON');
    }
    if (!Array.isArray(data)) throw new HolidayProviderUnavailableError('Holidays API returned an unexpected payload');
    return data;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new HolidayProviderUnavailableError('Holidays request timed out');
    throw err;
  }
}
