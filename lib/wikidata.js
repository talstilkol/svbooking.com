// Wikidata SPARQL client for hotel discovery
// Uses TripAdvisor IDs (P3134) to construct Xotelo-compatible hotel keys

import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout';

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'SVBooking-HotelDiscovery/1.0 (hotel catalog expansion)';
const WIKIDATA_TIMEOUT_MS = 15000;
const MAX_DISCOVERY_LIMIT = 500;

function cleanSparqlText(value) {
  return String(value || '').trim().replace(/\r?\n/g, ' ').slice(0, 160);
}

function sparqlString(value) {
  return `"${cleanSparqlText(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function sparqlEnglishLiteral(value) {
  return `${sparqlString(value)}@en`;
}

function parseLimit(value, fallback = 200, max = MAX_DISCOVERY_LIMIT) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.trunc(parsed), max);
}

/**
 * Execute a SPARQL query against Wikidata
 */
async function sparqlQuery(query, { timeoutMs = WIKIDATA_TIMEOUT_MS } = {}) {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set('query', query);
  url.searchParams.set('format', 'json');

  const res = await fetchWithTimeout(url.toString(), {
    timeoutMs,
    cache: 'no-store',
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new Error(`Wikidata SPARQL ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Discover hotels with TripAdvisor IDs from Wikidata.
 * Each result includes the city's TripAdvisor geo ID so we can construct
 * the full Xotelo key: g{cityGeoId}-d{hotelId}
 *
 * @param {Object} opts
 * @param {string} [opts.country] - Filter by country name (English)
 * @param {string} [opts.city] - Filter by city name (English)
 * @param {number} [opts.limit=200] - Max results
 * @returns {Promise<Array>} Array of { hotelKey, name, city, country, wikidataId, bookingId? }
 */
export async function discoverHotels({ country, city, limit = 200 } = {}) {
  const boundedLimit = parseLimit(limit);

  // Build country/city filter
  let filters = '';
  if (country) {
    filters += `?hotel wdt:P17 ?country . ?country rdfs:label ${sparqlEnglishLiteral(country)} .\n`;
  }
  if (city) {
    filters += `FILTER(CONTAINS(LCASE(?adminAreaLabel), LCASE(${sparqlString(city)})))`;
  }

  const query = `
    SELECT DISTINCT ?hotelLabel ?tripAdvisorId ?adminAreaLabel ?cityTAId ?countryLabel ?bookingId ?stars ?coord WHERE {
      ?hotel wdt:P31/wdt:P279* wd:Q27686 .
      ?hotel wdt:P3134 ?tripAdvisorId .
      ?hotel wdt:P131 ?adminArea .
      ?adminArea wdt:P3134 ?cityTAId .
      OPTIONAL { ?hotel wdt:P17 ?country }
      OPTIONAL { ?hotel wdt:P3607 ?bookingId }
      OPTIONAL { ?hotel wdt:P7820 ?stars }
      OPTIONAL { ?hotel wdt:P625 ?coord }
      ${filters}
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }
    LIMIT ${boundedLimit}
  `;

  const data = await sparqlQuery(query);
  const bindings = data?.results?.bindings || [];

  // Deduplicate by TripAdvisor ID (some hotels appear multiple times)
  const seen = new Set();
  const hotels = [];

  for (const b of bindings) {
    const hotelTAId = b.tripAdvisorId?.value;
    const cityTAId = b.cityTAId?.value;
    if (!hotelTAId || !cityTAId) continue;

    const key = `g${cityTAId}-d${hotelTAId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const name = b.hotelLabel?.value || 'Unknown Hotel';
    const cityName = b.adminAreaLabel?.value || 'Unknown';
    const countryName = b.countryLabel?.value || 'Unknown';
    const bookingId = b.bookingId?.value || null;
    const starRating = b.stars?.value ? Number(b.stars.value) : null;

    // Parse coordinates if available
    let lat = null, lon = null;
    if (b.coord?.value) {
      const match = b.coord.value.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
      if (match) {
        lon = parseFloat(match[1]);
        lat = parseFloat(match[2]);
      }
    }

    hotels.push({
      hotelKey: key,
      name,
      city: cleanCityName(cityName),
      country: countryName,
      bookingId,
      stars: starRating,
      lat,
      lon,
    });
  }

  return hotels;
}

/**
 * Get the count of hotels with TripAdvisor IDs in Wikidata
 */
export async function countAvailableHotels() {
  const query = `
    SELECT (COUNT(DISTINCT ?hotel) AS ?count) WHERE {
      ?hotel wdt:P31/wdt:P279* wd:Q27686 .
      ?hotel wdt:P3134 ?tripAdvisorId .
    }
  `;
  const data = await sparqlQuery(query);
  return Number(data?.results?.bindings?.[0]?.count?.value || 0);
}

/**
 * Get TripAdvisor geo IDs for major cities (used to build hotel keys)
 */
export async function getCityGeoIds(cityNames) {
  const values = Array.from(new Set(
    cityNames.map(cleanSparqlText).filter(Boolean)
  )).map(sparqlEnglishLiteral).join(' ');
  if (!values) return {};

  const query = `
    SELECT ?cityLabel ?cityTAId WHERE {
      ?city wdt:P31/wdt:P279* wd:Q515 .
      ?city wdt:P3134 ?cityTAId .
      ?city rdfs:label ?cityLabel .
      FILTER(?cityLabel IN (${values}))
      FILTER(LANG(?cityLabel) = "en")
    }
  `;
  const data = await sparqlQuery(query);
  const result = {};
  for (const b of data?.results?.bindings || []) {
    result[b.cityLabel.value] = b.cityTAId.value;
  }
  return result;
}

/**
 * Clean Wikidata city labels (remove "Xth arrondissement of" etc.)
 */
function cleanCityName(raw) {
  // "8th arrondissement of Paris" → "Paris"
  const arrMatch = raw.match(/\d+(?:st|nd|rd|th) arrondissement of (.+)/i);
  if (arrMatch) return arrMatch[1];

  // "City of London" → "London"
  const cityOfMatch = raw.match(/^City of (.+)/);
  if (cityOfMatch) return cityOfMatch[1];

  // "Borough of X" → "X"
  const boroughMatch = raw.match(/^Borough of (.+)/);
  if (boroughMatch) return boroughMatch[1];

  return raw;
}
