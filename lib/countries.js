// REST Countries — free country metadata, no auth required.
// Returns capital, currencies, languages, timezones, flags, etc.
// https://restcountries.com/
//
// Rate limit: generous

const API_URL = 'https://restcountries.com/v3.1';

// In-memory cache (country data rarely changes)
const cache = new Map();

/**
 * Get country details by ISO code.
 *
 * @param {string} code - ISO 3166-1 alpha-2 code (e.g., "FR")
 * @returns {Promise<{name, capital, currencies, languages, timezones, flag, region, subregion, latlng, population?}>}
 */
export async function getCountryByCode(code) {
  if (!code) throw new Error('Country code is required');
  const key = code.toUpperCase();

  if (cache.has(key)) return cache.get(key);

  const data = await fetchWithTimeout(
    `${API_URL}/alpha/${key}?fields=name,capital,currencies,languages,timezones,flag,region,subregion,latlng,population`
  );

  const result = {
    name: data.name?.common || key,
    officialName: data.name?.official || null,
    capital: data.capital?.[0] || null,
    currencies: data.currencies || {},
    languages: data.languages || {},
    timezones: data.timezones || [],
    flag: data.flag || '',
    region: data.region || null,
    subregion: data.subregion || null,
    latlng: data.latlng || null,
    population: data.population || null,
  };

  cache.set(key, result);
  return result;
}

/**
 * Get country details by name.
 *
 * @param {string} name - Country name (English)
 * @returns {Promise<Object>}
 */
export async function getCountryByName(name) {
  if (!name) throw new Error('Country name is required');

  if (cache.has(name)) return cache.get(name);

  const data = await fetchWithTimeout(
    `${API_URL}/name/${encodeURIComponent(name)}?fields=name,capital,currencies,languages,timezones,flag,region,subregion,latlng,cca2`
  );

  const entry = Array.isArray(data) ? data[0] : data;
  const result = {
    name: entry.name?.common || name,
    code: entry.cca2 || null,
    capital: entry.capital?.[0] || null,
    currencies: entry.currencies || {},
    languages: entry.languages || {},
    timezones: entry.timezones || [],
    flag: entry.flag || '',
    region: entry.region || null,
    subregion: entry.subregion || null,
    latlng: entry.latlng || null,
  };

  cache.set(name, result);
  return result;
}

/**
 * Get the primary currency for a country.
 */
export async function getPrimaryCurrency(countryCode) {
  const country = await getCountryByCode(countryCode);
  const currencies = Object.entries(country.currencies || {});
  if (currencies.length === 0) return null;
  const [code, info] = currencies[0];
  return { code, name: info.name, symbol: info.symbol };
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
    if (!res.ok) throw new Error(`REST Countries HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Countries request timed out');
    throw err;
  }
}
