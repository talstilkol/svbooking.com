/**
 * Xotelo Discovery Agent — Discovers hotels directly from Xotelo's search API.
 *
 * This is the most reliable discovery method because:
 * 1. Hotels found here are expected to use Xotelo-native hotel keys
 * 2. No need for cross-referencing between Wikidata/OSM/TripAdvisor IDs
 * 3. Hotels are immediately usable for pricing
 *
 * Scans top tourist cities systematically, adds candidates to the review queue.
 * Requires RAPIDAPI_KEY env var — Xotelo's search/list endpoints use RapidAPI auth.
 * Without the key, this agent returns a skipped status gracefully.
 */

import { runAgent, verifyCronAuth } from '@/lib/agent-utils';
import { kv } from '@/lib/kv';
import { findHotel, listCities } from '@/lib/hotels-catalog';
import { searchXoteloHotels, isXoteloDiscoveryConfigured } from '@/lib/xotelo-discovery';
import { upsertCandidates } from '@/lib/catalog-candidates';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

// Cities to scan (catalog cities + expansion targets)
const EXPANSION_CITIES = [
  'Madrid', 'Milan', 'Florence', 'Dublin', 'Edinburgh', 'Copenhagen',
  'Stockholm', 'Oslo', 'Warsaw', 'Bruges', 'Salzburg', 'Nice',
  'Seville', 'Valencia', 'Zurich', 'Geneva', 'Dubrovnik', 'Krakow',
  'Hong Kong', 'Taipei', 'Osaka', 'Kyoto', 'Mumbai', 'Goa', 'Hanoi',
  'San Francisco', 'Los Angeles', 'Chicago', 'Cancun', 'Mexico City',
  'Buenos Aires', 'Lima', 'Rio de Janeiro',
  'Marrakech', 'Cape Town', 'Doha', 'Amman', 'Auckland',
];

async function runXoteloDiscovery() {
  const startedAt = Date.now();

  // Check if RapidAPI key is available
  if (!isXoteloDiscoveryConfigured()) {
    return {
      status: 'skipped',
      reason: 'RAPIDAPI_KEY not configured — Xotelo search requires RapidAPI auth',
      citiesScanned: 0,
      totalHotelsFound: 0,
      newHotelsAdded: 0,
      elapsedMs: Date.now() - startedAt,
    };
  }

  // Round-robin: scan 6 cities per run
  const lastIdx = (await kv.get('agent:xotelo-discovery:lastIdx')) || 0;
  const allCities = [...new Set([...listCities(), ...EXPANSION_CITIES])];
  const batchSize = 6;
  const citiesToScan = [];
  for (let i = 0; i < batchSize; i++) {
    citiesToScan.push(allCities[(lastIdx + i) % allCities.length]);
  }
  await kv.setWithTTL('agent:xotelo-discovery:lastIdx', (lastIdx + batchSize) % allCities.length, 2592000);

  let totalFound = 0;
  let newHotels = 0;
  let errors = 0;

  for (const city of citiesToScan) {
    try {
      const hotels = await searchXoteloHotels(city);
      totalFound += hotels.length;

      // Filter to genuinely new hotels
      const newForCity = hotels.filter((h) => !findHotel(h.hotelKey));
      if (newForCity.length === 0) continue;

      const queued = await upsertCandidates(newForCity, { source: 'xotelo-discovery-agent' });
      newHotels += queued.saved;

      // Polite delay: 3s between cities
      await new Promise((r) => setTimeout(r, 3000));
    } catch {
      errors++;
    }
  }

  return {
    citiesScanned: citiesToScan.length,
    citiesBatch: citiesToScan,
    totalHotelsFound: totalFound,
    newHotelsAdded: newHotels,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const result = await runAgent('xotelo-discovery', runXoteloDiscovery);
    return Response.json(result, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('Xotelo discovery error:', err);
    return Response.json({ error: 'Xotelo discovery unavailable' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
