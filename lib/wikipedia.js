// Wikipedia REST API — free city/hotel descriptions and images, no auth.
// Returns summaries, thumbnails, and links from Wikipedia articles.
// https://en.wikipedia.org/api/rest_v1/
//
// Rate limit: 200 req/sec (very generous)

const WIKI_API = 'https://en.wikipedia.org/api/rest_v1';
const USER_AGENT = 'SVBooking/1.0 (hotel catalog)';

/**
 * Get a summary for a city or hotel from Wikipedia.
 *
 * @param {string} title - Wikipedia article title (e.g., "Paris", "Hilton Hotels")
 * @returns {Promise<{title, description, extract, thumbnail?, url}>}
 */
export async function getSummary(title, timeoutMs = 8000) {
  if (!title) throw new Error('Title is required');

  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const url = `${WIKI_API}/page/summary/${encoded}`;

  const data = await fetchWithTimeout(url, timeoutMs);
  if (data?.type === 'no-extract' || data?.type === 'not_found') return null;

  return {
    title: data.title,
    description: data.description || null,
    extract: data.extract || null,
    extractHtml: data.extract_html || null,
    thumbnail: data.thumbnail?.source || null,
    originalImage: data.originalimage?.source || null,
    url: data.content_urls?.desktop?.page || null,
    coordinates: data.coordinates
      ? { lat: data.coordinates.lat, lon: data.coordinates.lon }
      : null,
  };
}

/**
 * Get summaries for multiple cities (batched).
 *
 * @param {string[]} titles - Array of Wikipedia article titles
 * @returns {Promise<Map<string, Object>>}
 */
export async function batchSummaries(titles, timeoutMs = 8000) {
  const results = new Map();

  // Process in small batches (4 concurrent) to be polite
  for (let i = 0; i < titles.length; i += 4) {
    const batch = titles.slice(i, i + 4);
    const promises = batch.map(async (title) => {
      try {
        const summary = await getSummary(title, timeoutMs);
        if (summary) results.set(title, summary);
      } catch {
        // Skip failed lookups
      }
    });
    await Promise.all(promises);

    // Small delay between batches
    if (i + 4 < titles.length) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  return results;
}

/**
 * Search Wikipedia for articles matching a query.
 *
 * @param {string} query - Search query
 * @param {number} [limit=5] - Max results
 * @returns {Promise<Array<{title, description, thumbnail?}>>}
 */
export async function search(query, limit = 5, timeoutMs = 8000) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=${limit}&origin=*`;

  const data = await fetchWithTimeout(url, timeoutMs);
  return (data?.query?.search || []).map((r) => ({
    title: r.title,
    snippet: r.snippet?.replace(/<[^>]+>/g, '') || '',
    wordcount: r.wordcount,
  }));
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error(`Wikipedia request timed out after ${timeoutMs}ms`);
    throw err;
  }
}
