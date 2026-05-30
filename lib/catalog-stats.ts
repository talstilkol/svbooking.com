/**
 * Centralized catalog statistics derived from the static hotel catalog.
 * Import these constants instead of hardcoding catalog counts in UI or metadata.
 *
 * Safe for both server and client components — uses only the pure-data exports
 * from hotels-catalog.js (HOTELS array and listCities()), not the KV-backed
 * async functions.
 *
 * Values update automatically when hotels are added to lib/hotels-catalog.js.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { HOTELS, listCities } = require('./hotels-catalog');

const cities: string[] = listCities();
const countries = [...new Set((HOTELS as { country: string }[]).map((h) => h.country))];

/** Static catalog counts — auto-derived from the HOTELS array at import time. */
export const CATALOG_STATS = {
  hotels: HOTELS.length as number,
  cities: cities.length as number,
  countries: countries.length as number,
};
