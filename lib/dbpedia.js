// DBpedia — structured data from Wikipedia, free, no auth required.
// Complements Wikidata with richer textual descriptions and classifications.
// Hotels in DBpedia often have geographic coordinates, descriptions,
// and cross-links to Wikidata entities.
//
// SPARQL endpoint: https://dbpedia.org/sparql

const DBPEDIA_SPARQL = 'https://dbpedia.org/sparql';
const USER_AGENT = 'SVBooking-Discovery/1.0';

/**
 * Discover hotels from DBpedia for a given city.
 * Returns hotel names, coordinates, descriptions, and Wikipedia links.
 *
 * @param {Object} opts
 * @param {string} opts.city - City name (English)
 * @param {number} [opts.limit=30] - Max results
 * @returns {Promise<Array<{name, description?, lat?, lon?, wikipediaUrl?, wikidataId?}>>}
 */
export async function discoverHotelsDBpedia({ city, limit = 30, timeoutMs = 20000 }) {
  if (!city) throw new Error('City name is required');

  const query = `
    SELECT DISTINCT ?hotel ?name ?abstract ?lat ?lon ?wikidata WHERE {
      ?hotel a dbo:Hotel .
      ?hotel rdfs:label ?name .
      ?hotel dbo:location ?loc .
      ?loc rdfs:label ?locName .
      FILTER(LANG(?name) = "en")
      FILTER(LANG(?locName) = "en")
      FILTER(CONTAINS(LCASE(?locName), LCASE("${city.replace(/"/g, '')}")))
      OPTIONAL { ?hotel geo:lat ?lat . ?hotel geo:long ?lon }
      OPTIONAL { ?hotel dbo:abstract ?abstract . FILTER(LANG(?abstract) = "en") }
      OPTIONAL { ?hotel owl:sameAs ?wikidata . FILTER(STRSTARTS(STR(?wikidata), "http://www.wikidata.org/entity/")) }
    }
    LIMIT ${limit}
  `;

  const data = await sparqlQuery(query, timeoutMs);
  const bindings = data?.results?.bindings || [];

  const seen = new Set();
  return bindings
    .map((b) => {
      const name = b.name?.value;
      if (!name || seen.has(name)) return null;
      seen.add(name);

      return {
        name,
        description: b.abstract?.value?.slice(0, 300) || null,
        lat: b.lat?.value ? parseFloat(b.lat.value) : null,
        lon: b.lon?.value ? parseFloat(b.lon.value) : null,
        wikipediaUrl: b.hotel?.value?.replace('http://dbpedia.org/resource/', 'https://en.wikipedia.org/wiki/') || null,
        wikidataId: b.wikidata?.value?.split('/').pop() || null,
        source: 'dbpedia',
      };
    })
    .filter(Boolean);
}

/**
 * Get all hotels in DBpedia with Wikidata cross-references.
 * Useful for bulk enrichment.
 *
 * @param {number} [limit=100]
 * @returns {Promise<Array>}
 */
export async function getAllHotelsWithWikidata(limit = 100, timeoutMs = 30000) {
  const query = `
    SELECT ?name ?lat ?lon ?wikidata ?locName WHERE {
      ?hotel a dbo:Hotel .
      ?hotel rdfs:label ?name .
      ?hotel owl:sameAs ?wikidata .
      FILTER(LANG(?name) = "en")
      FILTER(STRSTARTS(STR(?wikidata), "http://www.wikidata.org/entity/"))
      OPTIONAL { ?hotel geo:lat ?lat . ?hotel geo:long ?lon }
      OPTIONAL { ?hotel dbo:location ?loc . ?loc rdfs:label ?locName . FILTER(LANG(?locName) = "en") }
    }
    LIMIT ${limit}
  `;

  const data = await sparqlQuery(query, timeoutMs);
  const bindings = data?.results?.bindings || [];

  return bindings.map((b) => ({
    name: b.name?.value,
    lat: b.lat?.value ? parseFloat(b.lat.value) : null,
    lon: b.lon?.value ? parseFloat(b.lon.value) : null,
    wikidataId: b.wikidata?.value?.split('/').pop() || null,
    city: b.locName?.value || null,
  }));
}

async function sparqlQuery(query, timeoutMs = 20000) {
  const url = new URL(DBPEDIA_SPARQL);
  url.searchParams.set('default-graph-uri', 'http://dbpedia.org');
  url.searchParams.set('query', query);
  url.searchParams.set('format', 'application/sparql-results+json');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`DBpedia SPARQL ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error(`DBpedia request timed out after ${timeoutMs}ms`);
    throw err;
  }
}
