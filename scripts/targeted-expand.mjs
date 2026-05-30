#!/usr/bin/env node

/**
 * Targeted Hotel Catalog Expansion
 * Discovers hotels from key tourist countries, validates against Xotelo,
 * filters to major cities only, and outputs clean catalog entries.
 */

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const XOTELO_BASE = 'https://data.xotelo.com/api';

// Target countries for expansion (high tourism value)
const TARGET_COUNTRIES = [
  'United Kingdom', 'Italy', 'Spain', 'Germany', 'Greece',
  'Turkey', 'United States of America', 'Mexico', 'Brazil',
  'Egypt', 'South Africa', 'Morocco',
  'India', 'South Korea', 'China', 'Malaysia', 'Vietnam',
  'Australia', 'Portugal', 'Switzerland', 'Austria',
  'Canada', 'Argentina', 'Colombia',
  'Kenya', 'Tanzania',
  'Croatia', 'Czech Republic', 'Hungary', 'Poland',
  'Philippines', 'Cambodia', 'Sri Lanka', 'Maldives',
  'Jordan', 'Oman', 'Saudi Arabia', 'Qatar',
  'Norway', 'Sweden', 'Denmark', 'Finland', 'Iceland',
];

// Known major tourist cities to prioritize
const MAJOR_CITIES = new Set([
  // Europe
  'London', 'Edinburgh', 'Manchester', 'Liverpool', 'Bath', 'Oxford', 'Cambridge', 'Brighton',
  'Rome', 'Florence', 'Venice', 'Milan', 'Naples', 'Amalfi', 'Verona', 'Bologna', 'Turin',
  'Madrid', 'Barcelona', 'Seville', 'Granada', 'Málaga', 'Valencia', 'Bilbao', 'San Sebastián', 'Ibiza',
  'Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Dresden', 'Düsseldorf', 'Stuttgart',
  'Athens', 'Santorini', 'Mykonos', 'Crete', 'Rhodes', 'Corfu', 'Thessaloniki',
  'Lisbon', 'Porto', 'Faro', 'Madeira',
  'Zurich', 'Geneva', 'Lucerne', 'Interlaken', 'Zermatt', 'Bern',
  'Budapest', 'Kraków', 'Warsaw', 'Dubrovnik', 'Split', 'Zagreb',
  'Copenhagen', 'Stockholm', 'Oslo', 'Helsinki', 'Reykjavik',
  // Americas
  'New York', 'Los Angeles', 'San Francisco', 'Chicago', 'Washington, D.C.', 'Boston',
  'Seattle', 'Miami', 'Las Vegas', 'Honolulu', 'San Diego', 'Nashville', 'New Orleans',
  'Austin', 'Denver', 'Philadelphia', 'Portland', 'Savannah',
  'Cancún', 'Mexico City', 'Playa del Carmen', 'Tulum', 'Puerto Vallarta',
  'Rio de Janeiro', 'São Paulo', 'Salvador',
  'Buenos Aires', 'Bogotá', 'Cartagena', 'Medellín',
  'Toronto', 'Vancouver', 'Montreal', 'Quebec City',
  // Middle East & Africa
  'Cairo', 'Luxor', 'Marrakech', 'Casablanca', 'Fez',
  'Cape Town', 'Johannesburg', 'Nairobi', 'Zanzibar', 'Dar es Salaam',
  'Amman', 'Petra', 'Muscat', 'Riyadh', 'Jeddah', 'Doha',
  // Asia & Oceania
  'Mumbai', 'Delhi', 'New Delhi', 'Jaipur', 'Agra', 'Goa', 'Udaipur', 'Varanasi', 'Bangalore', 'Hyderabad',
  'Seoul', 'Busan', 'Jeju',
  'Shanghai', 'Beijing', 'Hong Kong', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Xi\'an', 'Hangzhou',
  'Kuala Lumpur', 'Penang', 'Langkawi',
  'Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hoi An',
  'Manila', 'Cebu', 'Boracay',
  'Siem Reap', 'Phnom Penh',
  'Colombo', 'Galle', 'Kandy',
  'Malé',
  'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Cairns', 'Gold Coast',
  // Already in catalog (these exist but we want more hotels in them)
  'Tel Aviv', 'Jerusalem', 'Paris', 'London', 'Rome', 'Barcelona', 'Amsterdam',
  'Prague', 'Vienna', 'Istanbul', 'Dubai', 'New York', 'Miami', 'Las Vegas',
  'Tokyo', 'Bangkok', 'Singapore', 'Bali', 'Phuket', 'Sydney',
]);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function cleanCityName(raw) {
  const arr = raw.match(/\d+(?:st|nd|rd|th) arrondissement of (.+)/i);
  if (arr) return arr[1];
  const cityOf = raw.match(/^City of (.+)/);
  if (cityOf) return cityOf[1];
  const borough = raw.match(/^Borough of (.+)/);
  if (borough) return borough[1];
  // "Westminster" → "London" for hotels in London boroughs
  const londonBoroughs = ['Westminster', 'Camden', 'Kensington', 'Chelsea', 'Southwark', 'Tower Hamlets', 'Islington', 'Hackney', 'Lambeth'];
  if (londonBoroughs.some(b => raw.includes(b))) return 'London';
  return raw;
}

async function sparqlQuery(query) {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set('query', query);
  url.searchParams.set('format', 'json');
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'SVBooking-CatalogExpansion/1.0' },
  });
  if (res.status === 429) {
    console.log('  ⏳ Rate limited, waiting 65s...');
    await sleep(65000);
    return sparqlQuery(query);
  }
  if (!res.ok) throw new Error(`SPARQL ${res.status}: ${res.statusText}`);
  return res.json();
}

async function discoverForCountry(country) {
  const query = `
    SELECT DISTINCT ?hotelLabel ?tripAdvisorId ?adminAreaLabel ?cityTAId ?bookingId WHERE {
      ?hotel wdt:P31/wdt:P279* wd:Q27686 .
      ?hotel wdt:P3134 ?tripAdvisorId .
      ?hotel wdt:P131 ?adminArea .
      ?adminArea wdt:P3134 ?cityTAId .
      ?hotel wdt:P17 ?country .
      ?country rdfs:label "${country}"@en .
      OPTIONAL { ?hotel wdt:P3607 ?bookingId }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }
    LIMIT 100
  `;
  const data = await sparqlQuery(query);
  const bindings = data?.results?.bindings || [];
  const seen = new Set();
  const hotels = [];

  for (const b of bindings) {
    const hotelTAId = b.tripAdvisorId?.value;
    const cityTAId = b.cityTAId?.value;
    if (!hotelTAId || !cityTAId) continue;
    // Skip malformed TripAdvisor IDs (some have full URLs)
    if (hotelTAId.includes('Hotel_Review') || hotelTAId.length > 12) continue;

    const key = `g${cityTAId}-d${hotelTAId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const name = b.hotelLabel?.value?.trim();
    const cityLabel = b.adminAreaLabel?.value?.trim();
    if (!name || !cityLabel) continue;

    // Skip Wikidata Q-IDs that didn't resolve to labels
    if (name.startsWith('Q') && /^Q\d+$/.test(name)) continue;

    const city = cleanCityName(cityLabel);

    hotels.push({ hotelKey: key, name, city, country });
  }
  return hotels;
}

async function validateKey(hotelKey) {
  const today = new Date();
  const checkIn = new Date(today); checkIn.setDate(today.getDate() + 30);
  const checkOut = new Date(checkIn); checkOut.setDate(checkIn.getDate() + 2);
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
  } catch { clearTimeout(timer); return false; }
}

// ─── Main ───────────────────────────────────────

async function main() {
  console.log('🏨 SV Booking — Targeted Hotel Expansion');
  console.log('━'.repeat(50));

  // Load existing keys
  const fs = await import('fs');
  const content = fs.readFileSync(new URL('../lib/hotels-catalog.js', import.meta.url), 'utf-8');
  const existingKeys = new Set();
  for (const m of content.matchAll(/hotelKey:\s*'([^']+)'/g)) existingKeys.add(m[1]);
  console.log(`📋 Current catalog: ${existingKeys.size} hotels\n`);

  const allNew = [];

  for (let i = 0; i < TARGET_COUNTRIES.length; i++) {
    const country = TARGET_COUNTRIES[i];
    process.stdout.write(`[${i + 1}/${TARGET_COUNTRIES.length}] 🔍 ${country}...`);

    try {
      const hotels = await discoverForCountry(country);
      // Filter to major cities + not in catalog
      const filtered = hotels
        .filter(h => !existingKeys.has(h.hotelKey))
        .filter(h => MAJOR_CITIES.has(h.city));

      if (filtered.length > 0) {
        process.stdout.write(` ${hotels.length} found, ${filtered.length} in major cities`);
        allNew.push(...filtered);
      } else {
        process.stdout.write(` ${hotels.length} found, 0 in target cities`);
      }
    } catch (err) {
      process.stdout.write(` ❌ ${err.message}`);
    }
    console.log('');

    // Respect rate limits
    if (i < TARGET_COUNTRIES.length - 1) await sleep(2000);
  }

  console.log(`\n📊 Total new hotels in major cities: ${allNew.length}`);

  if (allNew.length === 0) {
    console.log('No new hotels found!');
    return;
  }

  // Validate all against Xotelo
  console.log(`\n🔬 Validating ${allNew.length} hotels against Xotelo API...`);
  const validated = [];
  const batchSize = 5;
  for (let i = 0; i < allNew.length; i += batchSize) {
    const batch = allNew.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (h) => ({ ...h, valid: await validateKey(h.hotelKey) }))
    );
    for (const r of results) {
      if (r.status === 'fulfilled') validated.push(r.value);
    }
    process.stdout.write(`\r  Validated ${Math.min(i + batchSize, allNew.length)}/${allNew.length}`);
    if (i + batchSize < allNew.length) await sleep(800);
  }
  console.log('');

  const validHotels = validated.filter(h => h.valid);
  console.log(`\n✅ Valid: ${validHotels.length} | ❌ Invalid: ${validated.length - validHotels.length}`);

  // Group by country → city
  const grouped = {};
  for (const h of validHotels) {
    const g = `${h.country} — ${h.city}`;
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(h);
  }

  // Output
  console.log('\n' + '═'.repeat(60));
  console.log('📝 VALIDATED CATALOG ENTRIES\n');

  // Collect unique new cities
  const newCities = new Set();
  const existingCities = new Set();
  for (const m of content.matchAll(/['"]([^'"]+)['"]\s*:\s*'https:\/\/images\.unsplash/g)) {
    existingCities.add(m[1]);
  }

  for (const [group, hotels] of Object.entries(grouped).sort()) {
    console.log(`  // ── ${group.toUpperCase()} ${'─'.repeat(Math.max(1, 50 - group.length))}`);
    for (const h of hotels.sort((a, b) => a.name.localeCompare(b.name))) {
      const pad = Math.max(1, 50 - h.name.length);
      console.log(`  { hotelKey: '${h.hotelKey}', name: '${h.name.replace(/'/g, "\\'")}',${' '.repeat(pad)}city: '${h.city.replace(/'/g, "\\'")}', country: '${h.country.replace(/'/g, "\\'")}', image: img('${h.city.replace(/'/g, "\\'")}') },`);
      if (!existingCities.has(h.city)) newCities.add(h.city);
    }
  }

  if (newCities.size > 0) {
    console.log('\n📸 Cities needing CITY_IMAGES entries:');
    for (const c of [...newCities].sort()) console.log(`  '${c}'`);
  }

  console.log(`\n🎯 Result: +${validHotels.length} validated hotels`);
  console.log(`   New catalog total: ${existingKeys.size + validHotels.length} hotels`);

  // Write JSON for easy programmatic use
  fs.writeFileSync(
    new URL('../scripts/discovered-hotels.json', import.meta.url),
    JSON.stringify(validHotels, null, 2)
  );
  console.log('\n💾 Saved to scripts/discovered-hotels.json');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
