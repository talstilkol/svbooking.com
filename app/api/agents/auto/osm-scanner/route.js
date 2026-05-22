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

import { runAgent, verifyCronAuth } from '@/lib/agent-utils';
import { kv } from '@/lib/kv';
import { HOTELS, findHotel, listCities } from '@/lib/hotels-catalog';
import { resolveWikidataToTripAdvisor } from '@/lib/wikidata-enrich';
import { getCityGeoIds } from '@/lib/wikidata';
import { upsertCandidates } from '@/lib/catalog-candidates';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
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

const EXPANSION_CITY_COUNTRIES = {
  Madrid: 'Spain',
  Milan: 'Italy',
  Florence: 'Italy',
  Dublin: 'Ireland',
  Edinburgh: 'UK',
  Copenhagen: 'Denmark',
  Stockholm: 'Sweden',
  Oslo: 'Norway',
  Warsaw: 'Poland',
  Bruges: 'Belgium',
  Salzburg: 'Austria',
  Nice: 'France',
  Marseille: 'France',
  Lyon: 'France',
  Seville: 'Spain',
  Valencia: 'Spain',
  Zurich: 'Switzerland',
  Geneva: 'Switzerland',
  Dubrovnik: 'Croatia',
  Krakow: 'Poland',
  Santorini: 'Greece',
  Mykonos: 'Greece',
  Reykjavik: 'Iceland',
  'Hong Kong': 'Hong Kong',
  Taipei: 'Taiwan',
  Osaka: 'Japan',
  Kyoto: 'Japan',
  Mumbai: 'India',
  Goa: 'India',
  Hanoi: 'Vietnam',
  'Ho Chi Minh City': 'Vietnam',
  'Phnom Penh': 'Cambodia',
  'Siem Reap': 'Cambodia',
  Kathmandu: 'Nepal',
  'San Francisco': 'USA',
  'Los Angeles': 'USA',
  Chicago: 'USA',
  Cancun: 'Mexico',
  'Mexico City': 'Mexico',
  'Buenos Aires': 'Argentina',
  Lima: 'Peru',
  Bogota: 'Colombia',
  'Rio de Janeiro': 'Brazil',
  Havana: 'Cuba',
  Marrakech: 'Morocco',
  'Cape Town': 'South Africa',
  Zanzibar: 'Tanzania',
  Doha: 'Qatar',
  Muscat: 'Oman',
  Amman: 'Jordan',
  Auckland: 'New Zealand',
  Queenstown: 'New Zealand',
  Fiji: 'Fiji',
};

function osmUrl(type, id) {
  return type && id ? `https://www.openstreetmap.org/${type}/${encodeURIComponent(id)}` : null;
}

function wikidataUrl(id) {
  return id ? `https://www.wikidata.org/wiki/${encodeURIComponent(id)}` : null;
}

function countryForCity(city) {
  return HOTELS.find((hotel) => hotel.city.toLowerCase() === city.toLowerCase())?.country ||
    EXPANSION_CITY_COUNTRIES[city] ||
    '';
}

function tripAdvisorIdFromRef(value) {
  const match = String(value || '').match(/\d+/);
  return match ? match[0] : null;
}

export function buildOsmCandidate({ hotel, city, cityGeoId, resolved }) {
  const tripAdvisorId = resolved?.tripAdvisorId || tripAdvisorIdFromRef(hotel?.tripadvisorRef);
  const geoId = resolved?.cityTripAdvisorId || cityGeoId;
  const candidateCity = resolved?.cityName || city;
  if (!hotel?.name || !tripAdvisorId || !geoId) return null;

  const source = resolved ? 'osm-wikidata-resolved' : 'osm-tripadvisor-ref';
  const sourceUrl = wikidataUrl(hotel.wikidataId) || osmUrl(hotel.osmType, hotel.osmId);

  return {
    hotelKey: `g${geoId}-d${tripAdvisorId}`,
    name: hotel.name,
    city: candidateCity,
    country: countryForCity(candidateCity),
    stars: hotel.stars,
    lat: hotel.lat,
    lon: hotel.lon,
    source,
    sourceUrl,
    wikidataId: hotel.wikidataId || null,
    osmId: hotel.osmId || null,
    externalIds: {
      wikidataId: hotel.wikidataId || null,
      osmId: hotel.osmId ? `${hotel.osmType || 'osm'}:${hotel.osmId}` : null,
      providerHotelId: tripAdvisorId,
    },
    provenance: {
      source,
      sourceUrl,
      wikidataId: hotel.wikidataId || null,
      osmId: hotel.osmId ? `${hotel.osmType || 'osm'}:${hotel.osmId}` : null,
      providerHotelId: tripAdvisorId,
    },
  };
}

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
          osmId: el.id,
          osmType: el.type,
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
        const candidate = buildOsmCandidate({ hotel: h, city, cityGeoId });
        if (candidate && !findHotel(candidate.hotelKey)) allDiscovered.push(candidate);
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
            const candidate = buildOsmCandidate({ hotel: h, city, cityGeoId, resolved: info });
            if (candidate && !findHotel(candidate.hotelKey)) allDiscovered.push(candidate);
          }
        } catch { /* wikidata resolution failed */ }
      }

      // 5s delay between cities
      await new Promise((r) => setTimeout(r, 5000));
    } catch {
      results.errors++;
    }
  }

  // Store discovered hotels in the review queue
  results.newHotels = allDiscovered.length;
  const queued = await upsertCandidates(allDiscovered, { source: 'osm-scanner-agent' });

  return {
    ...results,
    queuedCandidates: queued.saved,
    skippedCandidates: queued.skipped,
    citiesBatch: citiesToScan,
    elapsedMs: Date.now() - startedAt,
  };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const result = await runAgent('osm-scanner', runOSMScanner);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('OSM Scanner error:', err);
    return Response.json({ error: 'OSM scanner unavailable' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
