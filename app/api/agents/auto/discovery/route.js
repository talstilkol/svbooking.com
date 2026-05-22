// Discovery Agent — Automatically discovers new hotels via OSM Overpass + Wikidata.
// Pipeline: Overpass (find hotels) → Wikidata (get TripAdvisor IDs) → Xotelo (validate pricing)
// Stores validated candidates in the admin review queue for later catalog integration.

import { runAgent, verifyCronAuth, withConcurrency, AGENT_NAMES } from '@/lib/agent-utils';
import { discoverHotels } from '@/lib/overpass';
import { resolveWikidataToTripAdvisor } from '@/lib/wikidata-enrich';
import { getRates } from '@/lib/xotelo';
import { HOTELS, listCities, findHotel } from '@/lib/hotels-catalog';
import { kv } from '@/lib/kv';
import { upsertCandidates } from '@/lib/catalog-candidates';
import { addDays } from '@/lib/utils/date';

function wikidataUrl(id) {
  return id ? `https://www.wikidata.org/wiki/${encodeURIComponent(id)}` : null;
}

function osmUrl(type, id) {
  return type && id ? `https://www.openstreetmap.org/${type}/${encodeURIComponent(id)}` : null;
}

function countryForCity(city) {
  return HOTELS.find((hotel) => hotel.city.toLowerCase() === city.toLowerCase())?.country || '';
}

function getResolvedTripAdvisor(mapping, wikidataId) {
  if (!mapping || !wikidataId) return null;
  if (typeof mapping.get === 'function') return mapping.get(wikidataId) || null;
  return mapping[wikidataId] || null;
}

export function buildDiscoveryCandidate({ osmHotel, resolved, fallbackCity }) {
  const tripAdvisorId = resolved?.tripAdvisorId;
  const cityTripAdvisorId = resolved?.cityTripAdvisorId;
  if (!osmHotel?.name || !tripAdvisorId || !cityTripAdvisorId) return null;

  const city = resolved?.cityName || fallbackCity;
  return {
    name: osmHotel.name,
    hotelKey: `g${cityTripAdvisorId}-d${tripAdvisorId}`,
    city,
    country: countryForCity(city),
    lat: osmHotel.lat,
    lon: osmHotel.lon,
    wikidataId: osmHotel.wikidataId,
    osmId: osmHotel.osmId,
    stars: osmHotel.stars || null,
    brand: osmHotel.brand || null,
    source: 'osm-wikidata-xotelo-validated',
    sourceUrl: wikidataUrl(osmHotel.wikidataId) || osmUrl(osmHotel.osmType, osmHotel.osmId),
    externalIds: {
      wikidataId: osmHotel.wikidataId,
      osmId: osmHotel.osmId ? `${osmHotel.osmType || 'osm'}:${osmHotel.osmId}` : null,
      providerHotelId: tripAdvisorId,
    },
    provenance: {
      source: 'osm-wikidata-xotelo-validated',
      sourceUrl: wikidataUrl(osmHotel.wikidataId) || osmUrl(osmHotel.osmType, osmHotel.osmId),
      wikidataId: osmHotel.wikidataId || null,
      osmId: osmHotel.osmId ? `${osmHotel.osmType || 'osm'}:${osmHotel.osmId}` : null,
      providerHotelId: tripAdvisorId,
      validation: 'xotelo-rates',
      brand: osmHotel.brand || null,
    },
  };
}

/**
 * Pick the city to scan next (round-robin through all catalog cities).
 * Prefers cities that haven't been scanned recently.
 */
async function pickNextCity() {
  const cities = listCities();
  const lastScanned = await kv.get('agent:discovery:lastCity');
  const lastIdx = lastScanned ? cities.findIndex((c) => c === lastScanned) : -1;
  const nextIdx = (lastIdx + 1) % cities.length;
  return cities[nextIdx];
}

async function runDiscovery() {
  const city = await pickNextCity();
  await kv.setWithTTL('agent:discovery:lastCity', city, 2592000); // 30d

  // 1. Discover hotels with Wikidata IDs from OSM
  let osmHotels;
  try {
    osmHotels = await discoverHotels({ city, wikidataOnly: true, limit: 50 });
  } catch (err) {
    console.error('Discovery Overpass error:', err);
    return { city, error: 'Overpass unavailable', hotelsFound: 0, newHotels: 0 };
  }

  if (!osmHotels || osmHotels.length === 0) {
    return { city, hotelsFound: 0, newHotels: 0, message: 'No hotels with Wikidata IDs found' };
  }

  // 2. Extract Wikidata IDs and cross-reference to TripAdvisor
  const wikidataIds = osmHotels
    .filter((h) => h.wikidataId)
    .map((h) => h.wikidataId);

  let taMapping = {};
  if (wikidataIds.length > 0) {
    try {
      taMapping = await resolveWikidataToTripAdvisor(wikidataIds);
    } catch {
      // Wikidata SPARQL failed — continue with what we have
    }
  }

  // 3. Build potential hotel entries (only those with TripAdvisor IDs)
  const candidates = [];
  for (const osmHotel of osmHotels) {
    if (!osmHotel.wikidataId) continue;
    const resolved = getResolvedTripAdvisor(taMapping, osmHotel.wikidataId);
    const candidate = buildDiscoveryCandidate({ osmHotel, resolved, fallbackCity: city });
    if (!candidate) continue;

    // Check if already in catalog
    if (findHotel(candidate.hotelKey)) continue;

    candidates.push(candidate);
  }

  // 4. Validate candidates with Xotelo (check if hotel key returns rates)
  const today = new Date().toISOString().split('T')[0];
  const testCheckIn = addDays(today, 14);
  const testCheckOut = addDays(today, 16);
  const validated = [];

  const results = await withConcurrency(candidates, 3, async (candidate) => {
    try {
      const rates = await getRates({
        hotelKey: candidate.hotelKey,
        checkIn: testCheckIn,
        checkOut: testCheckOut,
        timeoutMs: 10000,
      });
      if (rates?.rates && rates.rates.length > 0) {
        return candidate;
      }
    } catch {
      // Hotel key not valid in Xotelo
    }
    return null;
  }, 1000); // 1s delay between batches

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      validated.push(r.value);
    }
  }

  // 5. Store validated hotels in the review queue
  let queued = 0;
  let skipped = 0;
  if (validated.length > 0) {
    const result = await upsertCandidates(validated, { source: 'discovery-agent' });
    queued = result.saved;
    skipped = result.skipped;
  }

  return {
    city,
    hotelsFound: osmHotels.length,
    withWikidata: wikidataIds.length,
    withTripAdvisor: candidates.length,
    validated: validated.length,
    newHotels: queued,
    queuedCandidates: queued,
    skippedCandidates: skipped,
    existingInCatalog: HOTELS.length,
  };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const status = await runAgent(AGENT_NAMES.DISCOVERY, runDiscovery);
    return Response.json(status, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('GET /api/agents/auto/discovery error:', err);
    return Response.json(
      { status: 'error', error: 'Discovery unavailable' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
