/**
 * Bulk Discovery Agent — Massively expands the hotel catalog using Wikidata SPARQL.
 *
 * Unlike the regular discovery agent (which scans one city at a time via Overpass),
 * this agent queries Wikidata for ALL hotels worldwide that have TripAdvisor IDs.
 * Wikidata has thousands of hotels with P3134 (TripAdvisor ID) and P3134 on their
 * admin area (city TripAdvisor geo ID), which gives us complete Xotelo-compatible keys.
 *
 * Free, no auth, one SPARQL query returns hundreds of hotels.
 *
 * Pipeline:
 *   1. Query Wikidata for hotels with TripAdvisor IDs, grouped by continent/region
 *   2. Validate a bounded subset with Xotelo (quick heatmap check)
 *   3. Store validated hotels in the admin review queue
 *   4. Track discovery stats
 */

import { runAgent, verifyCronAuth, withConcurrency } from '@/lib/agent-utils';
import { kv } from '@/lib/kv';
import { findHotel } from '@/lib/hotels-catalog';
import { upsertCandidates } from '@/lib/catalog-candidates';
import { addDays } from '@/lib/utils/date';

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const USER_AGENT = 'SVBooking-BulkDiscovery/1.0 (hotel catalog expansion)';
const XOTELO_BASE = 'https://data.xotelo.com/api';

/**
 * Run a SPARQL query against Wikidata
 */
async function sparqlQuery(query) {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set('query', query);
  url.searchParams.set('format', 'json');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': USER_AGENT,
      },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Wikidata SPARQL ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Discover ALL hotels worldwide with TripAdvisor IDs from Wikidata.
 * Returns hotels grouped by country with complete Xotelo-compatible keys.
 */
async function discoverGlobalHotels(regionFilter = null) {
  // Regional queries to avoid Wikidata timeout (split by continent)
  const regions = regionFilter ? [regionFilter] : [
    { name: 'Europe', filter: 'FILTER(?continentId = wd:Q46)' },
    { name: 'Asia', filter: 'FILTER(?continentId = wd:Q48)' },
    { name: 'Americas', filter: 'FILTER(?continentId IN (wd:Q49, wd:Q18))' },
    { name: 'Middle East & Africa', filter: 'FILTER(?continentId IN (wd:Q27, wd:Q15))' },
    { name: 'Oceania', filter: 'FILTER(?continentId = wd:Q538)' },
  ];

  const allHotels = [];

  for (const region of regions) {
    try {
      const query = `
        SELECT DISTINCT ?hotelLabel ?tripAdvisorId ?adminAreaLabel ?cityTAId ?countryLabel ?stars WHERE {
          ?hotel wdt:P31/wdt:P279* wd:Q27686 .
          ?hotel wdt:P3134 ?tripAdvisorId .
          ?hotel wdt:P131 ?adminArea .
          ?adminArea wdt:P3134 ?cityTAId .
          ?hotel wdt:P17 ?country .
          ?country wdt:P30 ?continentId .
          ${region.filter}
          OPTIONAL { ?hotel wdt:P7820 ?stars }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
        }
        LIMIT 500
      `;

      const data = await sparqlQuery(query);
      const bindings = data?.results?.bindings || [];

      const seen = new Set();
      for (const b of bindings) {
        const hotelTAId = b.tripAdvisorId?.value;
        const cityTAId = b.cityTAId?.value;
        if (!hotelTAId || !cityTAId) continue;

        const key = `g${cityTAId}-d${hotelTAId}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const name = b.hotelLabel?.value?.trim();
        const city = b.adminAreaLabel?.value?.trim();
        const country = b.countryLabel?.value?.trim();
        if (!name || !city || !country) continue;

        // Skip Wikidata placeholder labels (Q-numbers)
        if (name.startsWith('Q') && /^Q\d+$/.test(name)) continue;

        allHotels.push({
          hotelKey: key,
          name,
          city: cleanCityName(city),
          country,
          stars: b.stars?.value ? Number(b.stars.value) : null,
          region: region.name,
        });
      }

      // Be polite to Wikidata: 3s delay between region queries
      await new Promise((r) => setTimeout(r, 3000));
    } catch (err) {
      console.error(`Bulk discovery error for ${region.name}:`, err);
    }
  }

  return allHotels;
}

/**
 * Validate a hotel key with Xotelo by checking if heatmap returns data.
 * Much lighter than getRates — single call covers many dates.
 */
async function validateWithXotelo(hotelKey) {
  const checkOut = addDays(new Date().toISOString().split('T')[0], 16);
  const url = `${XOTELO_BASE}/heatmap?hotel_key=${hotelKey}&chk_out=${checkOut}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = await res.json();
    if (data.error) return false;
    const rates = data.result?.rates || data.result?.data || [];
    return Array.isArray(rates) && rates.length > 0;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

function cleanCityName(raw) {
  const arrMatch = raw.match(/\d+(?:st|nd|rd|th) arrondissement of (.+)/i);
  if (arrMatch) return arrMatch[1];
  const cityOfMatch = raw.match(/^City of (.+)/);
  if (cityOfMatch) return cityOfMatch[1];
  const boroughMatch = raw.match(/^Borough of (.+)/);
  if (boroughMatch) return boroughMatch[1];
  return raw;
}

async function runBulkDiscovery() {
  const startedAt = Date.now();

  // 1. Discover hotels from Wikidata (all regions)
  const discovered = await discoverGlobalHotels();

  // 2. Filter out hotels already in catalog
  const newHotels = discovered.filter((h) => !findHotel(h.hotelKey));

  // 3. Validate a bounded subset with Xotelo (max 200 for faster catalog growth)
  const subsetToValidate = newHotels.slice(0, 200);
  const validated = [];

  await withConcurrency(subsetToValidate, 3, async (hotel) => {
    const isValid = await validateWithXotelo(hotel.hotelKey);
    if (isValid) {
      validated.push(hotel);
    }
    return isValid;
  }, 1000); // 1s delay between batches

  // 4. Store validated hotels in the review queue
  const queued = await upsertCandidates(validated, { source: 'bulk-discovery-agent' });

  // 5. Also store ALL discovered (unvalidated) for catalog browsing
  await kv.setWithTTL('bulk-discovery:all', discovered, 604800); // 7 days
  await kv.setWithTTL('bulk-discovery:validated', validated, 2592000); // 30 days

  return {
    totalDiscovered: discovered.length,
    alreadyInCatalog: discovered.length - newHotels.length,
    newCandidates: newHotels.length,
    subsetValidated: subsetToValidate.length,
    validatedCount: validated.length,
    queuedCandidates: queued.saved,
    skippedCandidates: queued.skipped,
    citiesWithNewHotels: new Set(validated.map((hotel) => hotel.city)).size,
    regionBreakdown: Object.fromEntries(
      [...new Set(discovered.map((h) => h.region))].map((r) => [
        r,
        discovered.filter((h) => h.region === r).length,
      ])
    ),
    elapsedMs: Date.now() - startedAt,
  };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const result = await runAgent('bulk-discovery', runBulkDiscovery);
    return Response.json(result, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('Bulk discovery error:', err);
    return Response.json({ error: 'Bulk discovery unavailable' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
