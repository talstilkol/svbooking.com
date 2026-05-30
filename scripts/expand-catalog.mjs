#!/usr/bin/env node

/**
 * Hotel Catalog Expansion Script
 *
 * Discovers hotels from Wikidata SPARQL, validates their Xotelo keys,
 * and outputs new catalog entries ready to paste into hotels-catalog.js
 *
 * Usage:
 *   node scripts/expand-catalog.mjs                      # Discover from all countries
 *   node scripts/expand-catalog.mjs --country France      # Discover from France only
 *   node scripts/expand-catalog.mjs --city Paris          # Discover in Paris only
 *   node scripts/expand-catalog.mjs --validate            # Also validate keys against Xotelo
 *   node scripts/expand-catalog.mjs --limit 300           # Max hotels to discover
 */

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const XOTELO_BASE = 'https://data.xotelo.com/api';
// Parse CLI args
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return null;
  if (name === 'validate') return true; // flag only
  return args[idx + 1] || null;
}

const COUNTRY = getArg('country');
const CITY = getArg('city');
const VALIDATE = args.includes('--validate');
const LIMIT = Number(getArg('limit') || '200');

// ─── Wikidata Discovery ────────────────────────────────────

async function sparqlQuery(query) {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set('query', query);
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'SVBooking-CatalogExpansion/1.0',
    },
  });

  if (res.status === 429) {
    console.log('⏳ Wikidata rate limited, waiting 60s...');
    await sleep(60000);
    return sparqlQuery(query);
  }

  if (!res.ok) throw new Error(`SPARQL ${res.status}: ${res.statusText}`);
  return res.json();
}

function cleanCityName(raw) {
  const arr = raw.match(/\d+(?:st|nd|rd|th) arrondissement of (.+)/i);
  if (arr) return arr[1];
  const cityOf = raw.match(/^City of (.+)/);
  if (cityOf) return cityOf[1];
  const borough = raw.match(/^Borough of (.+)/);
  if (borough) return borough[1];
  return raw;
}

async function discoverHotels() {
  let countryFilter = '';
  let cityFilter = '';

  if (COUNTRY) {
    countryFilter = `?hotel wdt:P17 ?country . ?country rdfs:label "${COUNTRY}"@en .`;
  }
  if (CITY) {
    cityFilter = `FILTER(CONTAINS(LCASE(?adminAreaLabel), "${CITY.toLowerCase()}"))`;
  }

  const query = `
    SELECT DISTINCT ?hotelLabel ?tripAdvisorId ?adminAreaLabel ?cityTAId ?countryLabel ?bookingId ?stars WHERE {
      ?hotel wdt:P31/wdt:P279* wd:Q27686 .
      ?hotel wdt:P3134 ?tripAdvisorId .
      ?hotel wdt:P131 ?adminArea .
      ?adminArea wdt:P3134 ?cityTAId .
      OPTIONAL { ?hotel wdt:P17 ?country }
      OPTIONAL { ?hotel wdt:P3607 ?bookingId }
      OPTIONAL { ?hotel wdt:P7820 ?stars }
      ${countryFilter}
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }
    ${cityFilter}
    LIMIT ${LIMIT}
  `;

  console.log(`🔍 Querying Wikidata SPARQL (limit ${LIMIT})...`);
  const data = await sparqlQuery(query);
  const bindings = data?.results?.bindings || [];

  const seen = new Set();
  const hotels = [];

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

    hotels.push({
      hotelKey: key,
      name,
      city: cleanCityName(city),
      country,
      bookingId: b.bookingId?.value || null,
      stars: b.stars?.value ? Number(b.stars.value) : null,
    });
  }

  return hotels;
}

// ─── Xotelo Validation ─────────────────────────────────────

async function validateKey(hotelKey) {
  const today = new Date();
  const checkIn = new Date(today);
  checkIn.setDate(today.getDate() + 30);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkIn.getDate() + 2);

  const url = new URL(`${XOTELO_BASE}/rates`);
  url.searchParams.set('hotel_key', hotelKey);
  url.searchParams.set('chk_in', checkIn.toISOString().split('T')[0]);
  url.searchParams.set('chk_out', checkOut.toISOString().split('T')[0]);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = await res.json();
    const rates = data?.result?.rates || [];
    return rates.some((r) => Number(r.rate || 0) + Number(r.tax || 0) > 0);
  } catch {
    clearTimeout(timer);
    return false;
  }
}

async function validateBatch(hotels, batchSize = 3) {
  const results = [];
  for (let i = 0; i < hotels.length; i += batchSize) {
    const batch = hotels.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (h) => ({ ...h, valid: await validateKey(h.hotelKey) }))
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled') results.push(r.value);
    }
    process.stdout.write(`\r  Validated ${Math.min(i + batchSize, hotels.length)}/${hotels.length}`);
    if (i + batchSize < hotels.length) await sleep(1000); // Rate limit protection
  }
  console.log('');
  return results;
}

// ─── Output Formatting ─────────────────────────────────────

function formatCatalogEntry(hotel) {
  const pad = 50 - hotel.name.length;
  const spaces = pad > 0 ? ' '.repeat(pad) : ' ';
  return `  { hotelKey: '${hotel.hotelKey}', name: '${hotel.name.replace(/'/g, "\\'")}',${spaces}city: '${hotel.city.replace(/'/g, "\\'")}', country: '${hotel.country.replace(/'/g, "\\'")}', image: img('${hotel.city.replace(/'/g, "\\'")}') },`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Existing Catalog ──────────────────────────────────────

async function loadExistingKeys() {
  try {
    // Read the catalog file to extract existing keys
    const fs = await import('fs');
    const content = fs.readFileSync(new URL('../lib/hotels-catalog.js', import.meta.url), 'utf-8');
    const keys = new Set();
    const matches = content.matchAll(/hotelKey:\s*'([^']+)'/g);
    for (const m of matches) keys.add(m[1]);
    return keys;
  } catch {
    return new Set();
  }
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  console.log('🏨 SV Booking — Hotel Catalog Expansion');
  console.log('━'.repeat(50));

  if (COUNTRY) console.log(`  Country filter: ${COUNTRY}`);
  if (CITY) console.log(`  City filter: ${CITY}`);
  console.log(`  Validate against Xotelo: ${VALIDATE ? 'Yes' : 'No'}`);
  console.log('');

  // Load existing catalog
  const existingKeys = await loadExistingKeys();
  console.log(`📋 Current catalog: ${existingKeys.size} hotels`);

  // Discover from Wikidata
  const discovered = await discoverHotels();
  console.log(`📡 Wikidata returned: ${discovered.length} hotels with TripAdvisor IDs`);

  // Filter out existing
  const newHotels = discovered.filter((h) => !existingKeys.has(h.hotelKey));
  const alreadyInCatalog = discovered.length - newHotels.length;
  console.log(`✅ Already in catalog: ${alreadyInCatalog}`);
  console.log(`🆕 New hotels found: ${newHotels.length}`);

  if (newHotels.length === 0) {
    console.log('\n✨ No new hotels to add!');
    return;
  }

  // Validate if requested
  let validHotels = newHotels;
  if (VALIDATE) {
    console.log(`\n🔬 Validating ${newHotels.length} keys against Xotelo...`);
    const validated = await validateBatch(newHotels);
    validHotels = validated.filter((h) => h.valid);
    const invalidCount = validated.filter((h) => !h.valid).length;
    console.log(`  ✅ Valid: ${validHotels.length} | ❌ Invalid: ${invalidCount}`);
  }

  // Group by country and city
  const grouped = {};
  for (const h of validHotels) {
    const group = `${h.country} — ${h.city}`;
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(h);
  }

  // Output catalog entries
  console.log('\n' + '═'.repeat(50));
  console.log('📝 NEW CATALOG ENTRIES');
  console.log('Copy these into lib/hotels-catalog.js:\n');

  for (const [group, hotels] of Object.entries(grouped).sort()) {
    console.log(`  // ── ${group.toUpperCase()} ${'─'.repeat(Math.max(1, 45 - group.length))}`);
    for (const h of hotels.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(formatCatalogEntry(h));
    }
    console.log('');
  }

  // Also check what cities need images
  const newCities = new Set(validHotels.map((h) => h.city));
  const existingCitiesInFile = new Set();
  try {
    const fs = await import('fs');
    const content = fs.readFileSync(new URL('../lib/hotels-catalog.js', import.meta.url), 'utf-8');
    const cityMatches = content.matchAll(/['"]([^'"]+)['"]\s*:\s*'https:\/\/images\.unsplash/g);
    for (const m of cityMatches) existingCitiesInFile.add(m[1]);
  } catch {}

  const missingImages = [...newCities].filter((c) => !existingCitiesInFile.has(c));
  if (missingImages.length > 0) {
    console.log('📸 New cities that need verified HTTPS image URLs in CITY_IMAGES:');
    for (const c of missingImages.sort()) {
      console.log(`  ${c}`);
    }
  }

  console.log(`\n🎯 Summary: +${validHotels.length} hotels ready to add`);
  console.log(`   Total catalog would be: ${existingKeys.size + validHotels.length} hotels`);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
