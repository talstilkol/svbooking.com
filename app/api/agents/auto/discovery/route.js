// Discovery Agent — Automatically discovers new hotels via OSM Overpass + Wikidata.
// Pipeline: Overpass (find hotels) → Wikidata (get TripAdvisor IDs) → Xotelo (validate pricing)
// Stores discovered hotels in KV for later catalog integration.

import { runAgent, verifyCronAuth, withConcurrency, sleep, AGENT_NAMES } from '@/lib/agent-utils';
import { discoverHotels } from '@/lib/overpass';
import { resolveWikidataToTripAdvisor } from '@/lib/wikidata-enrich';
import { getRates } from '@/lib/xotelo';
import { HOTELS, listCities, findHotel } from '@/lib/hotels-catalog';
import { kv } from '@/lib/kv';

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
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
    return { city, error: `Overpass failed: ${err.message}`, hotelsFound: 0, newHotels: 0 };
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
    const taId = taMapping[osmHotel.wikidataId];
    if (!taId) continue;

    // Check if already in catalog
    if (findHotel(taId)) continue;

    candidates.push({
      name: osmHotel.name,
      hotelKey: taId,
      city,
      lat: osmHotel.lat,
      lon: osmHotel.lon,
      wikidataId: osmHotel.wikidataId,
      stars: osmHotel.stars || null,
      brand: osmHotel.brand || null,
      source: 'osm-discovery-agent',
    });
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

  // 5. Store discovered hotels in KV
  if (validated.length > 0) {
    const existingKey = `discovered:hotels:${city.toLowerCase()}`;
    const existing = (await kv.get(existingKey)) || [];
    const existingKeys = new Set(existing.map((h) => h.hotelKey));
    const newHotels = validated.filter((h) => !existingKeys.has(h.hotelKey));

    if (newHotels.length > 0) {
      const merged = [...existing, ...newHotels];
      await kv.setWithTTL(existingKey, merged, 2592000); // 30 days
    }
  }

  return {
    city,
    hotelsFound: osmHotels.length,
    withWikidata: wikidataIds.length,
    withTripAdvisor: candidates.length,
    validated: validated.length,
    newHotels: validated.length,
    existingInCatalog: HOTELS.length,
  };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const status = await runAgent(AGENT_NAMES.DISCOVERY, runDiscovery);
    return Response.json(status);
  } catch (err) {
    return Response.json(
      { status: 'error', error: err.message },
      { status: 500 }
    );
  }
}
