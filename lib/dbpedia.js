// DBpedia — structured data from Wikipedia, free, no auth required.
// Complements Wikidata with richer textual descriptions and classifications.
// Hotels in DBpedia often have geographic coordinates, descriptions,
// and cross-links to Wikidata entities.
//
// SPARQL endpoint: https://dbpedia.org/sparql

import { fetchWithTimeout } from './utils/fetch-with-timeout';
import { normalizeHttpsUrl } from './utils/public-url-safety';

const DBPEDIA_SPARQL = 'https://dbpedia.org/sparql';
const USER_AGENT = 'SVBooking-Discovery/1.0';
const MAX_DBPEDIA_LIMIT = 500;

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
  const boundedLimit = parseLimit(limit, 30);

  const query = `
    SELECT DISTINCT ?hotel ?name ?abstract ?lat ?lon ?wikidata WHERE {
      ?hotel a dbo:Hotel .
      ?hotel rdfs:label ?name .
      ?hotel dbo:location ?loc .
      ?loc rdfs:label ?locName .
      FILTER(LANG(?name) = "en")
      FILTER(LANG(?locName) = "en")
      FILTER(CONTAINS(LCASE(?locName), LCASE(${sparqlString(city)})))
      OPTIONAL { ?hotel geo:lat ?lat . ?hotel geo:long ?lon }
      OPTIONAL { ?hotel dbo:abstract ?abstract . FILTER(LANG(?abstract) = "en") }
      OPTIONAL { ?hotel owl:sameAs ?wikidata . FILTER(STRSTARTS(STR(?wikidata), "http://www.wikidata.org/entity/")) }
    }
    LIMIT ${boundedLimit}
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
        lat: normalizeLatitude(b.lat?.value),
        lon: normalizeLongitude(b.lon?.value),
        wikipediaUrl: normalizeHttpsUrl(b.hotel?.value?.replace('http://dbpedia.org/resource/', 'https://en.wikipedia.org/wiki/')),
        wikidataId: normalizeWikidataId(b.wikidata?.value),
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
  const boundedLimit = parseLimit(limit, 100);
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
    LIMIT ${boundedLimit}
  `;

  const data = await sparqlQuery(query, timeoutMs);
  const bindings = data?.results?.bindings || [];

  return bindings.map((b) => ({
    name: b.name?.value,
    lat: normalizeLatitude(b.lat?.value),
    lon: normalizeLongitude(b.lon?.value),
    wikidataId: normalizeWikidataId(b.wikidata?.value),
    city: b.locName?.value || null,
  }));
}

function cleanSparqlText(value) {
  return String(value).trim().replace(/\r?\n/g, ' ').slice(0, 160);
}

function sparqlString(value) {
  return `"${cleanSparqlText(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function parseLimit(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.trunc(parsed), MAX_DBPEDIA_LIMIT);
}

function normalizeLatitude(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= -90 && number <= 90 ? number : null;
}

function normalizeLongitude(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= -180 && number <= 180 ? number : null;
}

function normalizeWikidataId(value) {
  const id = String(value || '').split('/').pop()?.trim().toUpperCase();
  return id && /^Q\d+$/.test(id) ? id : null;
}

async function sparqlQuery(query, timeoutMs = 20000) {
  const url = new URL(DBPEDIA_SPARQL);
  url.searchParams.set('default-graph-uri', 'http://dbpedia.org');
  url.searchParams.set('query', query);
  url.searchParams.set('format', 'application/sparql-results+json');

  const res = await fetchWithTimeout(url.toString(), {
    timeoutMs,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' },
  });
  if (!res.ok) throw new Error(`DBpedia SPARQL ${res.status}`);
  return await res.json();
}
