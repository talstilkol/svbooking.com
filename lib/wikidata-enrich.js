// Wikidata Enrichment — resolves additional IDs for hotels.
// Uses SPARQL to find Booking.com slugs, Expedia IDs, coordinates,
// and other external identifiers from TripAdvisor IDs.
//
// Free, no auth. Rate: ~1 req/sec to be polite.

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'SVBooking-Enrichment/1.0';

/**
 * Enrich hotels with Booking.com IDs and other metadata from Wikidata.
 * Takes TripAdvisor hotel IDs (from hotel keys like "g123-d456")
 * and returns additional identifiers.
 *
 * @param {string[]} tripAdvisorIds - Array of TripAdvisor hotel IDs (numeric part)
 * @returns {Promise<Map<string, {bookingSlug?, expediaId?, officialWebsite?, image?, coords?}>>}
 */
export async function enrichFromWikidata(tripAdvisorIds) {
  if (!tripAdvisorIds.length) return new Map();

  const results = new Map();
  const chunks = [];
  for (let i = 0; i < tripAdvisorIds.length; i += 40) {
    chunks.push(tripAdvisorIds.slice(i, i + 40));
  }

  for (const chunk of chunks) {
    const values = chunk.map((id) => `"${id}"`).join(' ');
    const query = `
      SELECT ?taId ?bookingId ?expediaId ?website ?image ?coord ?hotelLabel WHERE {
        VALUES ?taId { ${values} }
        ?hotel wdt:P3134 ?taId .
        OPTIONAL { ?hotel wdt:P3607 ?bookingId }
        OPTIONAL { ?hotel wdt:P4309 ?expediaId }
        OPTIONAL { ?hotel wdt:P856 ?website }
        OPTIONAL { ?hotel wdt:P18 ?image }
        OPTIONAL { ?hotel wdt:P625 ?coord }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
      }
    `;

    try {
      const data = await sparqlFetch(query);
      for (const b of data?.results?.bindings || []) {
        const taId = b.taId?.value;
        if (!taId) continue;

        const entry = {};
        if (b.bookingId?.value) entry.bookingSlug = b.bookingId.value;
        if (b.expediaId?.value) entry.expediaId = b.expediaId.value;
        if (b.website?.value) entry.officialWebsite = b.website.value;
        if (b.image?.value) entry.image = b.image.value;
        if (b.hotelLabel?.value) entry.wikidataName = b.hotelLabel.value;
        if (b.coord?.value) {
          const match = b.coord.value.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
          if (match) {
            entry.lon = parseFloat(match[1]);
            entry.lat = parseFloat(match[2]);
          }
        }

        if (Object.keys(entry).length > 0) {
          results.set(taId, entry);
        }
      }
    } catch {
      console.error('Wikidata enrichment unavailable');
    }

    if (chunks.length > 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return results;
}

/**
 * Resolve Wikidata IDs to TripAdvisor IDs (for Overpass-discovered hotels).
 *
 * @param {string[]} wikidataIds - Array of Wikidata Q-IDs (e.g., ["Q904945", "Q2992084"])
 * @returns {Promise<Map<string, {tripAdvisorId, cityTripAdvisorId?, cityName?}>>}
 */
export async function resolveWikidataToTripAdvisor(wikidataIds) {
  if (!wikidataIds.length) return new Map();

  const results = new Map();
  const chunks = [];
  for (let i = 0; i < wikidataIds.length; i += 50) {
    chunks.push(wikidataIds.slice(i, i + 50));
  }

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

    try {
      const data = await sparqlFetch(query);
      for (const b of data?.results?.bindings || []) {
        const wdId = b.item?.value?.split('/').pop();
        if (!wdId) continue;

        results.set(wdId, {
          tripAdvisorId: b.taId?.value || null,
          cityTripAdvisorId: b.adminAreaTAId?.value || null,
          cityName: b.adminAreaLabel?.value || null,
        });
      }
    } catch {
      console.error('Wikidata resolve unavailable');
    }

    if (chunks.length > 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return results;
}

/**
 * Build a Booking.com direct URL from a Booking.com slug.
 */
export function buildBookingUrl(slug, checkIn, checkOut) {
  const base = `https://www.booking.com/hotel/${slug}.html`;
  if (checkIn && checkOut) {
    return `${base}?checkin=${checkIn}&checkout=${checkOut}&no_rooms=1&group_adults=2`;
  }
  return base;
}

async function sparqlFetch(query) {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set('query', query);
  url.searchParams.set('format', 'json');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': USER_AGENT,
      },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Wikidata SPARQL ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
