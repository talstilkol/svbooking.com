// Enrichment Agent — Enriches catalog data with Wikipedia descriptions,
// Wikidata cross-references (Booking.com slugs), and city metadata.
// All data sources are free and require no authentication.

import { runAgent, verifyCronAuth, withConcurrency, sleep, AGENT_NAMES } from '@/lib/agent-utils';
import { getSummary } from '@/lib/wikipedia';
import { enrichFromWikidata } from '@/lib/wikidata-enrich';
import { discoverHotelsDBpedia } from '@/lib/dbpedia';
import { listCities, HOTELS } from '@/lib/hotels-catalog';
import { kv } from '@/lib/kv';

const CITY_ENRICHMENT_TTL = 604800;    // 7 days
const BOOKING_ENRICHMENT_TTL = 2592000; // 30 days

async function runEnrichment() {
  const cities = listCities();
  let citiesEnriched = 0;
  let citiesFailed = 0;
  let bookingLinksFound = 0;
  let dbpediaHotels = 0;

  // 1. Enrich city descriptions via Wikipedia (1 req/sec to be polite)
  for (const city of cities) {
    const cacheKey = `enrichment:city:${city.toLowerCase()}`;
    try {
      const existing = await kv.get(cacheKey);
      if (existing) {
        citiesEnriched++;
        continue; // Already enriched, skip
      }

      const summary = await getSummary(city);
      if (summary) {
        await kv.setWithTTL(cacheKey, {
          extract: summary.extract || null,
          thumbnail: summary.thumbnail || null,
          url: summary.url || null,
          enrichedAt: new Date().toISOString(),
        }, CITY_ENRICHMENT_TTL);
        citiesEnriched++;
      }
      await sleep(500); // Respect Wikipedia rate limits
    } catch {
      citiesFailed++;
    }
  }

  // 2. Try to find Booking.com slugs via Wikidata for hotels
  // Group hotels by batches for the SPARQL query
  const hotelKeys = HOTELS.map((h) => h.hotelKey);
  // Extract TripAdvisor IDs (the numeric part after 'd')
  const taIds = hotelKeys
    .map((k) => {
      const match = k.match(/d(\d+)/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  if (taIds.length > 0) {
    try {
      const enrichment = await enrichFromWikidata(taIds.slice(0, 50)); // Process first 50
      if (enrichment) {
        for (const [taId, data] of Object.entries(enrichment)) {
          if (data.bookingSlug) {
            const cacheKey = `enrichment:booking:d${taId}`;
            await kv.setWithTTL(cacheKey, {
              bookingSlug: data.bookingSlug,
              wikidataId: data.wikidataId || null,
              enrichedAt: new Date().toISOString(),
            }, BOOKING_ENRICHMENT_TTL);
            bookingLinksFound++;
          }
        }
      }
    } catch {
      // Wikidata SPARQL may fail — non-critical
    }
  }

  // 3. Try DBpedia for a sample city (additional hotel descriptions)
  try {
    const sampleCity = cities[Math.floor(Math.random() * cities.length)];
    const dbpediaResults = await discoverHotelsDBpedia({ city: sampleCity, limit: 20 });
    if (dbpediaResults && dbpediaResults.length > 0) {
      await kv.setWithTTL(`enrichment:dbpedia:${sampleCity.toLowerCase()}`, dbpediaResults, CITY_ENRICHMENT_TTL);
      dbpediaHotels = dbpediaResults.length;
    }
  } catch {
    // DBpedia SPARQL may fail — non-critical
  }

  return {
    totalCities: cities.length,
    citiesEnriched,
    citiesFailed,
    bookingLinksFound,
    dbpediaHotels,
    hotelsInCatalog: HOTELS.length,
  };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const status = await runAgent(AGENT_NAMES.ENRICHMENT, runEnrichment);
    return Response.json(status);
  } catch (err) {
    return Response.json(
      { status: 'error', error: err.message },
      { status: 500 }
    );
  }
}
