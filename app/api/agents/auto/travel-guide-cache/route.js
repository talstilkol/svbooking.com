// Travel Guide Cache Agent — Pre-warms Wikivoyage safety, events, and dining data.
// Iterates all cities from the catalog and pre-fetches travel guide sections.
// Concurrency: 4 parallel requests (Wikimedia is generous), 250ms between batches.

import { runAgent, verifyCronAuth, withConcurrency, AGENT_NAMES } from '@/lib/agent-utils';
import { kv } from '@/lib/kv';
import { getSafetyInfo, getEventInfo, getDiningInfo } from '@/lib/wikivoyage';
import { listCities } from '@/lib/hotels-catalog';

const CACHE_TTL = 604800; // 7 days

async function runTravelGuideCache() {
  const cities = listCities();
  let safetyCached = 0;
  let eventsCached = 0;
  let diningCached = 0;
  let skipped = 0;
  let errors = 0;

  // Build work items: each city × each section
  const workItems = cities.flatMap((city) => [
    { city, section: 'safety' },
    { city, section: 'events' },
    { city, section: 'eat' },
  ]);

  await withConcurrency(workItems, 4, async ({ city, section }) => {
    const cacheKey = `wikivoyage:${section}:${city.toLowerCase()}`;

    // Skip if already cached
    const existing = await kv.get(cacheKey);
    if (existing !== null && existing !== undefined) {
      skipped++;
      return;
    }

    try {
      let data = null;
      switch (section) {
        case 'safety':
          data = await getSafetyInfo(city);
          if (data) safetyCached++;
          break;
        case 'events':
          data = await getEventInfo(city);
          if (data) eventsCached++;
          break;
        case 'eat':
          data = await getDiningInfo(city);
          if (data) diningCached++;
          break;
      }

      // Cache even null to avoid repeated API calls
      await kv.setWithTTL(cacheKey, data, CACHE_TTL);
    } catch {
      errors++;
    }
  }, 250); // 250ms between batches

  return {
    citiesProcessed: cities.length,
    safetyCached,
    eventsCached,
    diningCached,
    skipped,
    errors,
  };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const status = await runAgent(AGENT_NAMES.TRAVEL_GUIDE, runTravelGuideCache);
    return Response.json(status);
  } catch (err) {
    return Response.json(
      { status: 'error', error: err.message },
      { status: 500 }
    );
  }
}
