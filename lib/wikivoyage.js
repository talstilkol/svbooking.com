/**
 * Wikivoyage API — Free travel guides from the Wikimedia Foundation.
 *
 * Same API pattern as Wikipedia (already integrated in lib/wikipedia.js).
 * Provides structured travel guides with safety info, events, dining tips,
 * and transportation for hundreds of cities worldwide.
 *
 * Sections in a typical Wikivoyage article:
 *   "Understand", "Get in", "Get around", "See", "Do", "Buy",
 *   "Eat", "Drink", "Sleep", "Stay safe", "Stay healthy", "Connect"
 *
 * Rate limit: 200 req/sec (same as Wikipedia — very generous)
 * No auth required.
 */

import { fetchWithTimeout } from './utils/fetch-with-timeout';
import { normalizeHttpsUrl } from './utils/public-url-safety';

const WIKI_VOYAGE_API = 'https://en.wikivoyage.org/api/rest_v1';
const WIKI_VOYAGE_MW = 'https://en.wikivoyage.org/w/api.php';
const USER_AGENT = 'SVBooking/1.0 (hotel travel guides)';
const DEFAULT_TIMEOUT = 10000;

/**
 * Get a travel guide summary for a city.
 *
 * @param {string} city - City name
 * @returns {Promise<{title: string, extract: string, thumbnail?: string, url?: string} | null>}
 */
export async function getTravelGuide(city, timeoutMs = DEFAULT_TIMEOUT) {
  if (!city) return null;

  const encoded = encodeURIComponent(city.replace(/ /g, '_'));
  const url = `${WIKI_VOYAGE_API}/page/summary/${encoded}`;

  try {
    const data = await fetchWikivoyageJson(url, timeoutMs);
    if (!data || data.type === 'not_found' || data.type === 'no-extract') return null;

    return {
      title: data.title,
      extract: data.extract || null,
      thumbnail: normalizeHttpsUrl(data.thumbnail?.source),
      url: normalizeHttpsUrl(data.content_urls?.desktop?.page),
    };
  } catch {
    return null;
  }
}

/**
 * Get section list for a Wikivoyage article.
 *
 * @param {string} city - City name
 * @returns {Promise<Array<{index: string, name: string}>>}
 */
async function getSections(city, timeoutMs = DEFAULT_TIMEOUT) {
  const url = new URL(WIKI_VOYAGE_MW);
  url.searchParams.set('action', 'parse');
  url.searchParams.set('page', city);
  url.searchParams.set('prop', 'sections');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  try {
    const data = await fetchWikivoyageJson(url.toString(), timeoutMs);
    const sections = data?.parse?.sections || [];
    return sections.map((s) => ({
      index: s.index,
      name: s.line || '',
      level: s.level,
    }));
  } catch {
    return [];
  }
}

/**
 * Get the text content of a specific section by index.
 *
 * @param {string} city - City name
 * @param {string} sectionIndex - Section index from getSections()
 * @returns {Promise<string | null>} - Raw HTML content
 */
async function getSectionContent(city, sectionIndex, timeoutMs = DEFAULT_TIMEOUT) {
  const url = new URL(WIKI_VOYAGE_MW);
  url.searchParams.set('action', 'parse');
  url.searchParams.set('page', city);
  url.searchParams.set('section', sectionIndex);
  url.searchParams.set('prop', 'text');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  try {
    const data = await fetchWikivoyageJson(url.toString(), timeoutMs);
    return data?.parse?.text?.['*'] || null;
  } catch {
    return null;
  }
}

/**
 * Get safety information parsed from the "Stay safe" section.
 *
 * @param {string} city
 * @returns {Promise<{tips: string[], areas: Array<{name: string, safe: boolean, note: string}>, vaccinations: string | null, waterSafety: string | null} | null>}
 */
export async function getSafetyInfo(city, timeoutMs = DEFAULT_TIMEOUT) {
  const sections = await getSections(city, timeoutMs);
  const safeSection = sections.find((s) =>
    s.name.toLowerCase().includes('stay safe') || s.name.toLowerCase().includes('safety')
  );
  const healthSection = sections.find((s) =>
    s.name.toLowerCase().includes('stay healthy') || s.name.toLowerCase().includes('health')
  );

  let safetyHtml = null;
  let healthHtml = null;

  if (safeSection) {
    safetyHtml = await getSectionContent(city, safeSection.index, timeoutMs);
  }
  if (healthSection) {
    healthHtml = await getSectionContent(city, healthSection.index, timeoutMs);
  }

  if (!safetyHtml && !healthHtml) return null;

  return parseSafetyInfo(safetyHtml, healthHtml);
}

/**
 * Get event and activity info from the "Do" section.
 *
 * @param {string} city
 * @returns {Promise<Array<{name: string, month: string, icon: string, description: string | null}> | null>}
 */
export async function getEventInfo(city, timeoutMs = DEFAULT_TIMEOUT) {
  const sections = await getSections(city, timeoutMs);

  // Try "Do" first, then "Understand" (which sometimes has festival info)
  const doSection = sections.find((s) => s.name.toLowerCase() === 'do');
  const understandSection = sections.find((s) => s.name.toLowerCase() === 'understand');

  let html = null;
  if (doSection) html = await getSectionContent(city, doSection.index, timeoutMs);

  let understandHtml = null;
  if (understandSection) understandHtml = await getSectionContent(city, understandSection.index, timeoutMs);

  return parseEventInfo(html, understandHtml);
}

/**
 * Get dining info from the "Eat" section.
 *
 * @param {string} city
 * @returns {Promise<Array<{name: string, description: string | null, type: string}> | null>}
 */
export async function getDiningInfo(city, timeoutMs = DEFAULT_TIMEOUT) {
  const sections = await getSections(city, timeoutMs);
  const eatSection = sections.find((s) => s.name.toLowerCase() === 'eat');
  if (!eatSection) return null;

  const html = await getSectionContent(city, eatSection.index, timeoutMs);
  return parseDiningInfo(html);
}

// --- Internal parsers ---

function parseSafetyInfo(safetyHtml, healthHtml) {
  const tips = [];
  const areas = [];
  let vaccinations = null;
  let waterSafety = null;

  // Extract plain text tips from safety HTML
  if (safetyHtml) {
    const safetyText = stripHtml(safetyHtml);
    const sentences = safetyText
      .split(/[.!]\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15 && s.length < 200);

    // Take up to 5 most informative tips
    for (const sentence of sentences.slice(0, 8)) {
      if (tips.length >= 5) break;
      // Skip boilerplate/generic sentences
      if (sentence.toLowerCase().includes('wikivoyage')) continue;
      if (sentence.toLowerCase().includes('edit this')) continue;
      tips.push(sentence.endsWith('.') ? sentence : sentence + '.');
    }

    // Look for area/neighborhood mentions with safety context
    const areaPatterns = [
      /(?:avoid|dangerous|unsafe|caution|careful)\s+(?:in\s+)?(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|are)\s+(?:generally\s+)?(?:safe|dangerous|unsafe)/g,
    ];

    for (const pattern of areaPatterns) {
      let match;
      while ((match = pattern.exec(safetyText)) !== null) {
        const areaName = match[1];
        if (areaName.length < 3 || areaName.length > 30) continue;
        const context = safetyText.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50);
        const isSafe = /safe|secure/i.test(context) && !/unsafe|not safe/i.test(context);
        areas.push({
          name: areaName,
          safe: isSafe,
          note: isSafe ? 'Generally safe area' : 'Exercise caution',
        });
      }
    }
  }

  // Extract health info
  if (healthHtml) {
    const healthText = stripHtml(healthHtml);

    if (/vaccin/i.test(healthText)) {
      const vaccMatch = healthText.match(/vaccin[a-z]*[^.]*\./i);
      if (vaccMatch) vaccinations = vaccMatch[0].trim();
    }

    if (/tap water/i.test(healthText)) {
      if (/safe to drink/i.test(healthText)) {
        waterSafety = 'Tap water is safe to drink';
      } else if (/not safe|avoid|bottled/i.test(healthText)) {
        waterSafety = 'Drink bottled water';
      }
    }
  }

  if (tips.length === 0 && areas.length === 0 && !vaccinations && !waterSafety) {
    return null;
  }

  return {
    tips,
    areas: areas.slice(0, 4),
    vaccinations,
    waterSafety,
  };
}

function parseEventInfo(doHtml, understandHtml) {
  const events = [];

  // Common month patterns
  const monthPattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/gi;
  const iconMap = {
    festival: '🎉', music: '🎵', food: '🍽️', art: '🎨', film: '🎬',
    carnival: '🎭', parade: '🎊', sports: '⚽', marathon: '🏃',
    dance: '💃', fashion: '👗', wine: '🍷', beer: '🍺', flower: '🌸',
    christmas: '🎄', 'new year': '🎆', religious: '⛪', lantern: '🏮',
    boat: '🚢', fire: '🔥', light: '💡', water: '💦',
  };

  // Parse bold items from HTML (Wikivoyage uses <b> for notable items)
  const allHtml = (doHtml || '') + (understandHtml || '');
  const boldPattern = /<b>([^<]+)<\/b>/g;
  let match;

  while ((match = boldPattern.exec(allHtml)) !== null) {
    const name = match[1].trim();
    if (name.length < 3 || name.length > 80) continue;
    // Skip generic words
    if (/^(the|and|or|but|for|this|that|these|also|see|do|visit)$/i.test(name)) continue;

    // Try to find month context
    const surrounding = allHtml.substring(
      Math.max(0, match.index - 100),
      Math.min(allHtml.length, match.index + match[0].length + 200)
    );
    const surroundingText = stripHtml(surrounding);

    const monthMatches = [...surroundingText.matchAll(monthPattern)];
    const month = monthMatches.length > 0
      ? monthMatches[0][1].slice(0, 3)
      : '';

    // Determine icon from context
    let icon = '📅';
    const lowerContext = surroundingText.toLowerCase();
    for (const [keyword, emoji] of Object.entries(iconMap)) {
      if (lowerContext.includes(keyword)) {
        icon = emoji;
        break;
      }
    }

    // Extract description
    const descText = surroundingText.replace(name, '').trim();
    const description = descText.length > 20 ? descText.slice(0, 120).trim() + '...' : null;

    events.push({ name, month, icon, description });
  }

  // Deduplicate by name
  const seen = new Set();
  return events
    .filter((e) => {
      const key = e.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function parseDiningInfo(html) {
  if (!html) return null;

  const items = [];
  const boldPattern = /<b>([^<]+)<\/b>/g;
  let match;

  while ((match = boldPattern.exec(html)) !== null) {
    const name = match[1].trim();
    if (name.length < 3 || name.length > 60) continue;

    // Get surrounding text for description
    const surrounding = html.substring(
      match.index,
      Math.min(html.length, match.index + match[0].length + 300)
    );
    const text = stripHtml(surrounding).trim();
    const description = text.length > name.length + 5
      ? text.slice(name.length).trim().slice(0, 150)
      : '';

    items.push({
      name,
      description: description || null,
      type: 'restaurant',
    });
  }

  return items.slice(0, 10);
}

/**
 * Strip HTML tags and decode entities.
 */
function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWikivoyageJson(url, timeoutMs = DEFAULT_TIMEOUT) {
  try {
    const res = await fetchWithTimeout(url, {
      timeoutMs,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
