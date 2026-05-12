/**
 * OSM Scanner Agent — Finds hotels with TripAdvisor IDs via OpenStreetMap.
 *
 * OSM hotels often have `ref:tripadvisor` tags with the numeric TripAdvisor ID.
 * Combined with Wikidata city geo IDs, we can build complete Xotelo-compatible keys.
 *
 * Also discovers hotels with `wikidata` tags, then resolves their TripAdvisor IDs
 * via Wikidata SPARQL.
 *
 * Scans top tourist cities systematically. Free, no auth.
 */

import { runAgent, verifyCronAuth, withConcurrency } from '@/lib/agent-utils';
import { kv } from '@/lib/kv';
import { findHotel, listCities } from '@/lib/hotels-catalog';
import { resolveWikidataToTripAdvisor } from '@/lib/wikidata-enrich';
import { getCityGeoIds } from '@/lib/wikidata';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'SVBooking-OSMScanner/1.0';

// Top tourist cities to scan (beyond what's already in catalog)
const EXPANSION_CITIES = [
  // Europe
  'Madrid', 'Milan', 'Florence', 'Dublin', 'Edinburgh', 'Copenhagen',
  'Stockholm', 'Oslo', 'Warsaw', 'Bruges', 'Salzburg', 'Nice', 'Marseille',
  'Lyon', 'Seville', 'Valencia', 'Zurich', 'Geneva', 'Dubrovnik', 'Krakow',
  'Santorini', 'Mykonos', 'Reykjavik',
  // Asia
  'Hong Kong', 'Taipei', 'Osaka', 'Kyoto', 'Mumbai', 'Goa', 'Hanoi',
  'Ho Chi Minh City', 'Phnom Penh', 'Siem Reap', 'Kathmandu',
  // Americas
  'San Francisco', 'Los Angeles', 'Chicago', 'Cancun', 'Mexico City',
  'Buenos Aires', 'Lima', 'Bogota', 'Rio de Janeiro', 'Havana',
  // Africa & Middle East
  'Marrakech', 'Cape Town', 'Zanzibar', 'Doha', 'Muscat', 'Amman',
  // Oceania
  'Auckland', 'Queenstown', 'Fiji',
];

/**
 * Query Overpass for hotels with TripAdvisor refs in a city.
 */
async function findHotelsWithTARef(city) {
  const query = `[out:json][timeout:25];
area["name"="${city}"]["admin_level"~"^[2-8]$"]->.searchArea;
(
  node["tourism"="hotel"]["ref:tripadvisor"](area.searchArea);
  way["tourism"="hotel"]["ref:tripadvisor"](area.searchArea);
  node["tourism"="hotel"]["wikidata"](area.searchArea);
  way["tourism"="hotel"]["wikidata"](area.searchArea);
);
out body 100;`;

  const url = new URL(OVERPASS_URL);
  url.searchParams.set('data', query);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.elements || [])
      .map((el) => {
        const tags = el.tags || {};
        const name = tags.name || tags['name:en'];
        if (!name) return null;
        return {
          name,
          tripadvisorRef: tags['ref:tripadvisor'] || null,
          wikidataId: tags.wikidata || null,
          stars: tags.stars ? Number(tags.stars) : null,
          lat: el.lat || el.center?.lat,
          lon: el.lon || el.center?.lon,
        };
      })
      .filter(Boolean);
  } catch {
    clearTimeout(timer);
    return [];
  }
}

async function runOSMScanner() {
  const startedAt = Date.now();

  // Determine which cities to scan (round-robin through expansion + catalog cities)
  const lastScannedIdx = (await kv.get('agent:osm-scanner:lastIdx')) || 0;
  const allCities = [...new Set([...listCities(), ...EXPANSION_CITIES])];
  const batchSize = 8; // Scan 8 cities per run
  const citiesToScan = [];
  for (let i = 0; i < batchSize; i++) {
    citiesToScan.push(allCities[(lastScannedIdx + i) % allCities.length]);
  }
  await kv.setWithTTL('agent:osm-scanner:lastIdx', (lastScannedIdx + batchSize) % allCities.length, 2592000);

  // Get city TripAdvisor geo IDs from Wikidata
  let cityGeoIds;
  try {
    cityGeoIds = await getCityGeoIds(citiesToScan);
  } catch {
    cityGeoIds = {};
  }

  const results = { citiesScanned: 0, hotelsFound: 0, newHotels: 0, errors: 0 };
  const allDiscovered = [];

  // Scan cities with 5s delay between each (be polite to Overpass)
  for (const city of citiesToScan) {
    try {
      const hotels = await findHotelsWithTARef(city);
      results.citiesScanned++;
      results.hotelsFound += hotels.length;

      const cityGeoId = cityGeoIds[city];

      // Hotels with direct TripAdvisor refs
      const directTA = hotels.filter((h) => h.tripadvisorRef && cityGeoId);
      for (const h of directTA) {
        const hotelKey = `g${cityGeoId}-d${h.tripadvisorRef}`;
        if (!findHotel(hotelKey)) {
          allDiscovered.push({
            hotelKey,
            name: h.name,
            city,
            country: '', // Will be enriched later
            stars: h.stars,
            source: 'osm-tripadvisor-ref',
          });
        }
      }

      // Hotels with Wikidata IDs — resolve to TripAdvisor IDs
      const wikidataHotels = hotels.filter((h) => h.wikidataId && !h.tripadvisorRef);
      if (wikidataHotels.length > 0) {
        try {
          const resolved = await resolveWikidataToTripAdvisor(
            wikidataHotels.map((h) => h.wikidataId)
          );

          for (const h of wikidataHotels) {
            const info = resolved.get(h.wikidataId);
            if (!info?.tripAdvisorId) continue;
            const geoId = info.cityTripAdvisorId || cityGeoId;
            if (!geoId) continue;

            const hotelKey = `g${geoId}-d${info.tripAdvisorId}`;
            if (!findHotel(hotelKey)) {
              allDiscovered.push({
                hotelKey,
                name: h.name,
                city: info.cityName || city,
                country: '',
                stars: h.stars,
                source: 'osm-wikidata-resolved',
              });
            }
          }
        } catch { /* wikidata resolution failed */ }
      }

      // 5s delay between cities
      await new Promise((r) => setTimeout(r, 5000));
    } catch {
      results.errors++;
    }
  }

  // Store discovered hotels
  results.newHotels = allDiscovered.length;

  // Group by city and merge into KV
  const byCity = new Map();
  for (const h of allDiscovered) {
    const key = h.city.toLowerCase();
    if (!byCity.has(key)) byCity.set(key, []);
    byCity.get(key).push(h);
  }

  for (const [cityKey, hotels] of byCity) {
    const existingKey = `discovered:hotels:${cityKey}`;
    const existing = (await kv.get(existingKey)) || [];
    const existingKeys = new Set(existing.map((h) => h.hotelKey));
    const newForCity = hotels.filter((h) => !existingKeys.has(h.hotelKey));
    if (newForCity.length > 0) {
      await kv.setWithTTL(existingKey, [...existing, ...newForCity], 2592000);
    }
  }

  return {
    ...results,
    citiesBatch: citiesToScan,
    elapsedMs: Date.now() - startedAt,
  };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const result = await runAgent('osm-scanner', runOSMScanner);
    return Response.json(result);
  } catch (err) {
    console.error('OSM Scanner error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
