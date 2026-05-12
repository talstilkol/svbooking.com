#!/usr/bin/env node

/**
 * OSM Hotel Discovery Pipeline
 *
 * Cross-references 3 free headless sources to expand the hotel catalog:
 *   1. Overpass API → finds hotels in a city with Wikidata IDs
 *   2. Wikidata SPARQL → gets TripAdvisor IDs from Wikidata IDs
 *   3. Xotelo → validates hotel keys work for pricing
 *
 * Usage:
 *   node scripts/osm-expand.mjs                     # All target cities
 *   node scripts/osm-expand.mjs --city Paris         # Single city
 *   node scripts/osm-expand.mjs --validate           # Also validate with Xotelo
 *   node scripts/osm-expand.mjs --city London --limit 100
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const SPARQL_URL = 'https://query.wikidata.org/sparql';
const XOTELO_URL = 'https://data.xotelo.com/api/rates';
const USER_AGENT = 'SVBooking-CatalogExpand/1.0';

// Target cities for expansion
const TARGET_CITIES = [
  // Europe
  'Paris', 'London', 'Rome', 'Barcelona', 'Amsterdam', 'Berlin', 'Prague',
  'Vienna', 'Munich', 'Madrid', 'Lisbon', 'Athens', 'Budapest', 'Warsaw',
  'Copenhagen', 'Stockholm', 'Oslo', 'Brussels', 'Zurich', 'Milan',
  'Florence', 'Venice', 'Edinburgh', 'Dublin', 'Nice', 'Marseille',
  // Asia
  'Tokyo', 'Bangkok', 'Singapore', 'Hong Kong', 'Seoul', 'Taipei',
  'Kuala Lumpur', 'Jakarta', 'Manila', 'Mumbai', 'Delhi', 'Colombo',
  // Middle East
  'Dubai', 'Istanbul', 'Doha', 'Riyadh', 'Tel Aviv',
  // Americas
  'New York', 'Miami', 'Los Angeles', 'San Francisco', 'Chicago', 'Toronto',
  'Mexico City', 'Rio de Janeiro', 'Buenos Aires', 'Lima', 'Bogota',
  // Africa
  'Nairobi', 'Cape Town', 'Marrakech', 'Cairo', 'Casablanca',
  // Oceania
  'Sydney', 'Melbourne', 'Auckland', 'Brisbane',
];

const args = process.argv.slice(2);
const cityFilter = getArg('--city');
const limitArg = Number(getArg('--limit') || '30');
const doValidate = args.includes('--validate');

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 20000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...opts.headers },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Step 1: Find hotels in a city with Wikidata IDs (Overpass)
 */
async function findHotelsWithWikidata(city, limit) {
  const query = `[out:json][timeout:25];
area["name"="${city}"]["admin_level"~"^[2-8]$"]->.searchArea;
(
  node["tourism"="hotel"]["wikidata"](area.searchArea);
  way["tourism"="hotel"]["wikidata"](area.searchArea);
);
out body ${limit};`;

  const url = new URL(OVERPASS_URL);
  url.searchParams.set('data', query);

  const data = await fetchJson(url.toString(), { timeoutMs: 30000 });
  return (data?.elements || [])
    .filter((el) => el.tags?.name && el.tags?.wikidata)
    .map((el) => ({
      name: el.tags.name,
      wikidataId: el.tags.wikidata,
      stars: el.tags.stars ? Number(el.tags.stars) : null,
      brand: el.tags.brand || null,
      lat: el.lat || el.center?.lat,
      lon: el.lon || el.center?.lon,
    }));
}

/**
 * Step 2: Get TripAdvisor IDs from Wikidata IDs (SPARQL)
 */
async function getTripAdvisorIds(wikidataIds) {
  if (wikidataIds.length === 0) return {};

  // Batch into chunks of 50 (SPARQL VALUES limit)
  const chunks = [];
  for (let i = 0; i < wikidataIds.length; i += 50) {
    chunks.push(wikidataIds.slice(i, i + 50));
  }

  const results = {};

  for (const chunk of chunks) {
    const values = chunk.map((id) => `wd:${id}`).join(' ');
    const query = `
      SELECT ?item ?taId ?adminArea ?adminAreaTAId ?adminAreaLabel WHERE {
        VALUES ?item { ${values} }
        ?item wdt:P3134 ?taId .
        OPTIONAL {
          ?item wdt:P131 ?adminArea .
          ?adminArea wdt:P3134 ?adminAreaTAId .
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
      }
    `;

    const url = new URL(SPARQL_URL);
    url.searchParams.set('query', query);
    url.searchParams.set('format', 'json');

    try {
      const data = await fetchJson(url.toString(), {
        timeoutMs: 30000,
        headers: { Accept: 'application/sparql-results+json' },
      });

      for (const b of data?.results?.bindings || []) {
        const wdId = b.item?.value?.split('/').pop();
        const taId = b.taId?.value;
        const cityTAId = b.adminAreaTAId?.value;
        const cityLabel = b.adminAreaLabel?.value;

        if (wdId && taId) {
          results[wdId] = {
            tripAdvisorId: taId,
            cityTripAdvisorId: cityTAId || null,
            cityName: cityLabel || null,
          };
        }
      }
    } catch (err) {
      console.error(`  SPARQL error for chunk: ${err.message}`);
    }

    if (chunks.length > 1) await sleep(2000);
  }

  return results;
}

/**
 * Step 3: Validate Xotelo key works
 */
async function validateXoteloKey(hotelKey) {
  const checkIn = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const checkOut = new Date(Date.now() + 32 * 86400000).toISOString().split('T')[0];

  const url = new URL(XOTELO_URL);
  url.searchParams.set('hotel_key', hotelKey);
  url.searchParams.set('chk_in', checkIn);
  url.searchParams.set('chk_out', checkOut);

  try {
    const data = await fetchJson(url.toString(), { timeoutMs: 12000 });
    const rates = data?.result?.rates;
    return rates && rates.length > 0;
  } catch {
    return false;
  }
}

/**
 * Main pipeline: Overpass → Wikidata → Xotelo
 */
async function processCities() {
  const cities = cityFilter ? [cityFilter] : TARGET_CITIES;
  const allResults = [];
  let totalOsm = 0;
  let totalWithTA = 0;
  let totalValidated = 0;

  console.log(`\n🏨 OSM Hotel Discovery Pipeline`);
  console.log(`   Cities: ${cities.length} | Limit: ${limitArg}/city | Validate: ${doValidate}`);
  console.log(`${'─'.repeat(60)}\n`);

  for (const city of cities) {
    process.stdout.write(`📍 ${city}: `);

    try {
      // Step 1: Overpass
      const hotels = await findHotelsWithWikidata(city, limitArg);
      totalOsm += hotels.length;
      process.stdout.write(`${hotels.length} OSM hotels → `);

      if (hotels.length === 0) {
        console.log('skip (none found)');
        await sleep(1500);
        continue;
      }

      // Step 2: Wikidata SPARQL
      const wikidataIds = hotels.map((h) => h.wikidataId);
      await sleep(2000); // Rate limit between Overpass and Wikidata
      const taMapping = await getTripAdvisorIds(wikidataIds);

      const withTA = hotels.filter((h) => taMapping[h.wikidataId]?.tripAdvisorId);
      totalWithTA += withTA.length;
      process.stdout.write(`${withTA.length} with TA IDs`);

      // Build hotel entries
      for (const hotel of withTA) {
        const ta = taMapping[hotel.wikidataId];
        if (!ta.tripAdvisorId || !ta.cityTripAdvisorId) continue;

        // Filter out malformed IDs
        if (ta.tripAdvisorId.includes('Hotel_Review') || ta.tripAdvisorId.length > 12) continue;
        if (ta.cityTripAdvisorId.length > 10) continue;

        const hotelKey = `g${ta.cityTripAdvisorId}-d${ta.tripAdvisorId}`;
        let validated = null;

        if (doValidate) {
          await sleep(1500);
          validated = await validateXoteloKey(hotelKey);
          if (validated) totalValidated++;
        }

        allResults.push({
          hotelKey,
          name: hotel.name,
          city: ta.cityName || city,
          stars: hotel.stars,
          brand: hotel.brand,
          lat: hotel.lat,
          lon: hotel.lon,
          wikidataId: hotel.wikidataId,
          validated,
          source: 'osm-pipeline',
        });
      }

      console.log(doValidate ? ` → ${allResults.filter((r) => r.city === city || r.city === (taMapping[withTA[0]?.wikidataId]?.cityName || city)).length} validated` : '');
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }

    await sleep(2000); // Be polite to OSM servers
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📊 Results:`);
  console.log(`   OSM hotels found:      ${totalOsm}`);
  console.log(`   With TripAdvisor IDs:  ${totalWithTA}`);
  console.log(`   Unique hotel keys:     ${allResults.length}`);
  if (doValidate) {
    console.log(`   Xotelo validated:      ${totalValidated}`);
  }

  // Save results
  if (allResults.length > 0) {
    const { writeFileSync } = await import('fs');
    const outPath = new URL('./osm-discovered-hotels.json', import.meta.url);
    writeFileSync(outPath, JSON.stringify(allResults, null, 2));
    console.log(`\n💾 Saved ${allResults.length} hotels to scripts/osm-discovered-hotels.json`);

    // Print catalog-ready entries
    console.log(`\n📋 Catalog entries (copy to hotels-catalog.js):\n`);
    for (const h of allResults.slice(0, 20)) {
      const starStr = h.stars ? `, stars: ${h.stars}` : '';
      console.log(`  { hotelKey: '${h.hotelKey}', name: '${h.name.replace(/'/g, "\\'")}', city: '${h.city}'${starStr} },`);
    }
    if (allResults.length > 20) {
      console.log(`  ... and ${allResults.length - 20} more`);
    }
  }
}

processCities().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
