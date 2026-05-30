// Wikidata Enrichment — resolves additional IDs for hotels.
// Uses SPARQL to find Booking.com slugs, Expedia IDs, coordinates,
// and other external identifiers from TripAdvisor IDs.
//
// Free, no auth. Rate: ~1 req/sec to be polite.

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'SVBooking-Enrichment/1.0';
const BOOKING_SLUG_BLOCKLIST_PATTERN = /[:?#\u0000-\u001f\u007f]/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Enrich hotels with Booking.com IDs and other metadata from Wikidata.
 * Takes TripAdvisor hotel IDs (from hotel keys like "g123-d456")
 * and returns additional identifiers.
 *
 * @param {string[]} tripAdvisorIds - Array of TripAdvisor hotel IDs (numeric part)
 * @returns {Promise<Map<string, {bookingSlug?, expediaId?, officialWebsite?, image?, coords?}>>}
 */
export async function enrichFromWikidata(tripAdvisorIds) {
  const safeTripAdvisorIds = normalizeTripAdvisorIds(tripAdvisorIds);
  if (!safeTripAdvisorIds.length) return new Map();

  const results = new Map();
  const chunks = [];
  for (let i = 0; i < safeTripAdvisorIds.length; i += 40) {
    chunks.push(safeTripAdvisorIds.slice(i, i + 40));
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
        const taId = normalizeTripAdvisorId(b.taId?.value);
        if (!taId || !safeTripAdvisorIds.includes(taId)) continue;

        const entry = {};
        const bookingSlug = normalizeBookingSlug(b.bookingId?.value);
        const expediaId = normalizeText(b.expediaId?.value);
        const officialWebsite = normalizeHttpsUrl(b.website?.value);
        const image = normalizeHttpsUrl(b.image?.value);
        const wikidataName = normalizeText(b.hotelLabel?.value);

        if (bookingSlug) entry.bookingSlug = bookingSlug;
        if (expediaId) entry.expediaId = expediaId;
        if (officialWebsite) entry.officialWebsite = officialWebsite;
        if (image) entry.image = image;
        if (wikidataName) entry.wikidataName = wikidataName;
        if (b.coord?.value) {
          const coords = parsePoint(b.coord.value);
          if (coords) {
            entry.lon = coords.lon;
            entry.lat = coords.lat;
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
  const safeWikidataIds = normalizeWikidataIds(wikidataIds);
  if (!safeWikidataIds.length) return new Map();

  const results = new Map();
  const chunks = [];
  for (let i = 0; i < safeWikidataIds.length; i += 50) {
    chunks.push(safeWikidataIds.slice(i, i + 50));
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
        const wdId = normalizeWikidataId(b.item?.value?.split('/').pop());
        if (!wdId || !safeWikidataIds.includes(wdId)) continue;

        const tripAdvisorId = normalizeTripAdvisorId(b.taId?.value);
        if (!tripAdvisorId) continue;

        results.set(wdId, {
          tripAdvisorId,
          cityTripAdvisorId: normalizeTripAdvisorId(b.adminAreaTAId?.value),
          cityName: normalizeText(b.adminAreaLabel?.value),
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
  const safeSlug = normalizeBookingSlug(slug);
  if (!safeSlug) return null;
  const encodedSlug = safeSlug.split('/').map(encodeURIComponent).join('/');
  const base = `https://www.booking.com/hotel/${encodedSlug}.html`;
  if (isValidDateRange(checkIn, checkOut)) {
    const url = new URL(base);
    url.searchParams.set('checkin', checkIn);
    url.searchParams.set('checkout', checkOut);
    url.searchParams.set('no_rooms', '1');
    url.searchParams.set('group_adults', '2');
    return url.toString();
  }
  return base;
}

function normalizeText(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim().replace(/\s+/g, ' ');
  return text || null;
}

function normalizeTripAdvisorId(id) {
  const text = normalizeText(id);
  return text && /^\d+$/.test(text) ? text : null;
}

function normalizeWikidataId(id) {
  const text = normalizeText(id)?.toUpperCase();
  return text && /^Q\d+$/.test(text) ? text : null;
}

function normalizeBookingSlug(value) {
  const text = normalizeText(value)?.replace(/^\/+|\/+$/g, '');
  if (!text || BOOKING_SLUG_BLOCKLIST_PATTERN.test(text)) return null;
  return text.split('/').every((segment) => segment.trim()) ? text : null;
}

function normalizeHttpsUrl(value) {
  const text = normalizeText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function parsePoint(value) {
  const match = normalizeText(value)?.match(/^Point\(([-\d.]+)\s+([-\d.]+)\)$/);
  if (!match) return null;
  const lon = Number(match[1]);
  const lat = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function isValidDateRange(checkIn, checkOut) {
  const start = parseDateString(checkIn);
  const end = parseDateString(checkOut);
  return Boolean(start && end && start < end);
}

function parseDateString(value) {
  const text = String(value || '');
  if (!DATE_PATTERN.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === text ? date : null;
}

function normalizeTripAdvisorIds(ids) {
  if (!Array.isArray(ids)) return [];
  return Array.from(new Set(
    ids.map(normalizeTripAdvisorId).filter(Boolean)
  ));
}

function normalizeWikidataIds(ids) {
  if (!Array.isArray(ids)) return [];
  return Array.from(new Set(
    ids.map(normalizeWikidataId).filter(Boolean)
  ));
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
