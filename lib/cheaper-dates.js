import { getCachedHeatmap, getCachedRates } from './price-cache';
import { addDays, daysBetween } from './utils/date';
import { normalizeHttpsUrl } from './utils/public-url-safety';

/** Maximum total time for the entire findCheaperDates operation */
const TOTAL_TIMEOUT_MS = 45_000; // 45 seconds
/** Per-batch timeout for heatmap requests */
const BATCH_TIMEOUT_MS = 12_000; // 12 seconds per batch
const DATA_POLICY = 'verified-provider-or-source-observations-only';
const HEATMAP_PRICE_SOURCE = 'xotelo-heatmap';
const HEATMAP_PRICE_SOURCE_LABEL = 'Xotelo heatmap observation';
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const BLOCKED_PRICE_VALUES = new Set([
  '',
  'unknown',
  'unknown provider',
  'none',
  'null',
  'undefined',
  'unavailable',
  'estimated',
  'estimate',
  'heatmap',
  'xotelo-heatmap',
]);

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizedKey(value) {
  return normalizeText(value).toLowerCase();
}

function isBlockedPriceValue(value) {
  return BLOCKED_PRICE_VALUES.has(normalizedKey(value));
}

function toPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function normalizeCurrency(value, fallback = 'USD') {
  const currency = normalizeText(value).toUpperCase();
  if (CURRENCY_PATTERN.test(currency)) return currency;
  const fallbackCurrency = normalizeText(fallback).toUpperCase();
  return CURRENCY_PATTERN.test(fallbackCurrency) ? fallbackCurrency : 'USD';
}

function isIsoDate(value) {
  const date = normalizeText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().split('T')[0] === date;
}

function emptyCheaperDatesResult({ checkIn, checkOut, nights = null, startTime = Date.now(), reason }) {
  return {
    originalDates: { checkIn, checkOut, nights },
    originalPrice: null,
    originalProvider: null,
    originalSource: null,
    alternatives: { near: [], week: [], month: [] },
    cheapestOverall: null,
    hasRealData: false,
    dataPolicy: DATA_POLICY,
    method: 'unavailable',
    availabilityReason: reason,
    elapsedMs: Date.now() - startTime,
    timedOut: false,
  };
}

function validateStayDates(checkIn, checkOut) {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) {
    return { valid: false, nights: null, reason: 'Invalid date input for cheaper-date lookup' };
  }
  const nights = daysBetween(checkIn, checkOut);
  if (!Number.isInteger(nights) || nights <= 0) {
    return { valid: false, nights, reason: 'checkIn must be before checkOut for cheaper-date lookup' };
  }
  return { valid: true, nights, reason: null };
}

export function getVerifiedRateObservations(result) {
  return (result?.rates || [])
    .map((rate) => {
      const provider = normalizeText(rate?.provider || rate?.name);
      const source = normalizeText(rate?.source || result?.source || result?.provider);
      const priceSource = normalizedKey(rate?.priceSource || result?.priceSource);
      const baseRate = toPositiveNumber(rate?.rate);
      const tax = Number(rate?.tax || 0);
      const total = toPositiveNumber(rate?.total) || (
        baseRate !== null && Number.isFinite(tax) ? baseRate + Math.max(0, tax) : null
      );

      if (!provider || isBlockedPriceValue(provider)) return null;
      if (source && isBlockedPriceValue(source)) return null;
      if (priceSource === 'heatmap' || priceSource === HEATMAP_PRICE_SOURCE) return null;
      if (!total || total <= 0) return null;

      return {
        provider,
        code: rate?.code || null,
        rate: baseRate ?? total,
        tax: Number.isFinite(tax) ? Math.max(0, tax) : 0,
        source: source || null,
        total,
        currency: normalizeCurrency(rate?.currency, result?.currency),
        freshness: rate?.freshness || result?.freshness || 'unknown',
        partial: Boolean(rate?.partial ?? result?.partial),
        deepLink: normalizeHttpsUrl(rate?.deepLink),
        lastCheckedAt: rate?.lastCheckedAt || result?.lastCheckedAt || null,
        priceAccuracyState: rate?.priceAccuracyState || 'unobserved',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.total - b.total);
}

function getHeatmapEntries(heatmapData) {
  if (!heatmapData) return [];
  if (Array.isArray(heatmapData)) return heatmapData;
  if (Array.isArray(heatmapData.daily)) return heatmapData.daily;
  if (Array.isArray(heatmapData.rates)) return heatmapData.rates;
  if (Array.isArray(heatmapData.data)) return heatmapData.data;
  return [];
}

export async function getHeatmapCalendar({ hotelKey, checkOut, today = new Date().toISOString().split('T')[0], timeoutMs = BATCH_TIMEOUT_MS }) {
  if (!hotelKey || !isIsoDate(checkOut)) return [];
  const safeToday = isIsoDate(today) ? today : new Date().toISOString().split('T')[0];
  const result = await getCachedHeatmap({ hotelKey, checkOut, timeoutMs });
  const entries = getHeatmapEntries(result);

  return entries
    .map((entry) => {
      const date = normalizeText(entry?.chk_in || entry?.date);
      const price = toPositiveNumber(entry?.rate ?? entry?.price ?? entry?.min_rate);
      if (!isIsoDate(date) || date < safeToday || !price) return null;
      return {
        date,
        price: Number(price.toFixed(2)),
        source: HEATMAP_PRICE_SOURCE,
        priceSource: HEATMAP_PRICE_SOURCE,
        priceSourceLabel: HEATMAP_PRICE_SOURCE_LABEL,
        bookingProvider: false,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Check if total operation has exceeded its time budget */
function isTimedOut(startTime) {
  return Date.now() - startTime > TOTAL_TIMEOUT_MS;
}

/**
 * Generate candidate checkout dates for heatmap queries.
 * Each heatmap call returns prices for a single checkout date across many check-in dates.
 * We generate checkout dates that cover ±3d, ±7d, ±30d brackets.
 */
function generateCandidateCheckouts(checkOut, nights) {
  const today = new Date().toISOString().split('T')[0];
  const checkouts = new Set();

  // Offsets from the original checkout date
  for (let offset = -30; offset <= 30; offset++) {
    if (offset === 0) continue;
    const candidateCheckOut = addDays(checkOut, offset);
    const candidateCheckIn = addDays(candidateCheckOut, -nights);
    if (candidateCheckIn < today) continue;
    checkouts.add(candidateCheckOut);
  }

  return Array.from(checkouts).sort();
}

/**
 * Fetch heatmaps in parallel batches (concurrency limit) with timeout awareness.
 * Each heatmap call for a given checkOut returns an array of { date, price } for multiple check-in dates.
 * Stops early if total operation time budget is exceeded.
 */
async function fetchHeatmapBatch(hotelKey, checkoutDates, concurrency = 5, startTime) {
  const results = new Map();

  for (let i = 0; i < checkoutDates.length; i += concurrency) {
    // Check total time budget before starting a new batch
    if (startTime && isTimedOut(startTime)) {
      console.warn(`[cheaper-dates] Time budget exceeded after ${i} of ${checkoutDates.length} heatmap calls`);
      break;
    }

    const batch = checkoutDates.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (checkOut) => {
        const data = await getCachedHeatmap({ hotelKey, checkOut, timeoutMs: BATCH_TIMEOUT_MS });
        return { checkOut, data };
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value.data) {
        results.set(result.value.checkOut, result.value.data);
      }
    }
  }

  return results;
}

/**
 * Extract price for a specific number of nights from heatmap data.
 * Heatmap returns array of { date, price } where date is check-in and price is per-night.
 * We need to find the check-in date that gives us the right number of nights to checkOut.
 */
function extractPriceForNights(heatmapData, nights, checkOutDate) {
  const targetCheckIn = addDays(checkOutDate, -nights);
  const entries = getHeatmapEntries(heatmapData);

  for (const entry of entries) {
    const observedPrice = toPositiveNumber(entry.price ?? entry.rate ?? entry.min_rate);
    const observedDate = entry.chk_in || entry.date;
    if (observedDate === targetCheckIn && observedPrice) {
      return {
        checkIn: targetCheckIn,
        checkOut: checkOutDate,
        pricePerNight: Number(observedPrice),
        totalPrice: Number((observedPrice * nights).toFixed(2)),
      };
    }
  }

  return null;
}

/**
 * Classify an offset into a bracket.
 */
function classifyBracket(offset) {
  const abs = Math.abs(offset);
  if (abs <= 3) return 'near';
  if (abs <= 7) return 'week';
  return 'month';
}

/**
 * Main exported function: find cheaper date alternatives using heatmap API.
 * Much more efficient than per-candidate getRates calls:
 * - getRates approach: ~20-30 API calls (one per candidate date)
 * - getHeatmap approach: ~3-6 API calls (each covers many check-in dates)
 */
export async function findCheaperDates(hotelKey, checkIn, checkOut) {
  const startTime = Date.now();
  const dateValidation = validateStayDates(checkIn, checkOut);
  if (!hotelKey || !dateValidation.valid) {
    return emptyCheaperDatesResult({
      checkIn,
      checkOut,
      nights: dateValidation.nights,
      startTime,
      reason: !hotelKey ? 'Missing hotel key for cheaper-date lookup' : dateValidation.reason,
    });
  }

  const nights = dateValidation.nights;
  const today = new Date().toISOString().split('T')[0];

  // 1. Get original price via getRates (single call for accurate current price)
  let originalPrice = null;
  let originalProvider = null;
  let originalSource = null;
  try {
    const result = await getCachedRates({ hotelKey, checkIn, checkOut, timeoutMs: BATCH_TIMEOUT_MS });
    const rates = getVerifiedRateObservations(result);

    if (rates.length > 0) {
      originalPrice = rates[0].total;
      originalProvider = rates[0].provider;
      originalSource = rates[0].source;
    }
  } catch {
    // continue without original price
  }

  // 2. Generate candidate checkout dates and deduplicate
  const candidateCheckouts = generateCandidateCheckouts(checkOut, nights);

  // 3. Reduce to unique checkout months to minimize API calls
  // Heatmap returns a full month of data per checkOut, so group by month
  const monthCheckouts = new Map();
  for (const co of candidateCheckouts) {
    const month = co.slice(0, 7); // YYYY-MM
    if (!monthCheckouts.has(month)) {
      monthCheckouts.set(month, co); // Use first checkout date in each month
    }
  }

  // Also include the actual candidate checkouts (limit to ~15 for efficiency)
  const checkoutsToFetch = Array.from(new Set([
    ...monthCheckouts.values(),
    ...candidateCheckouts.slice(0, 12),
  ])).slice(0, 15);

  // 4. Fetch heatmaps in batch (5 concurrent) with time budget
  const heatmapResults = await fetchHeatmapBatch(hotelKey, checkoutsToFetch, 5, startTime);

  // 5. Extract prices for each candidate date
  const alternatives = { near: [], week: [], month: [] };

  for (let offset = -30; offset <= 30; offset++) {
    if (offset === 0) continue;

    const candidateCheckOut = addDays(checkOut, offset);
    const candidateCheckIn = addDays(candidateCheckOut, -nights);
    if (candidateCheckIn < today) continue;

    // Try to find price from heatmap data
    const heatmapData = heatmapResults.get(candidateCheckOut);
    if (!heatmapData) continue;

    const priceInfo = extractPriceForNights(heatmapData, nights, candidateCheckOut);
    if (!priceInfo) continue;

    const bracket = classifyBracket(offset);
    const savings = originalPrice ? Number((originalPrice - priceInfo.totalPrice).toFixed(2)) : 0;
    const savingsPct = originalPrice
      ? Math.round(((originalPrice - priceInfo.totalPrice) / originalPrice) * 100)
      : 0;

    alternatives[bracket].push({
      checkIn: priceInfo.checkIn,
      checkOut: priceInfo.checkOut,
      price: priceInfo.totalPrice,
      pricePerNight: priceInfo.pricePerNight,
      provider: null,
      source: HEATMAP_PRICE_SOURCE,
      priceSource: HEATMAP_PRICE_SOURCE,
      priceSourceLabel: HEATMAP_PRICE_SOURCE_LABEL,
      bookingProvider: false,
      savings,
      savingsPct,
    });
  }

  // 6. If heatmap yielded no results, fall back to limited getRates calls
  const heatmapResultCount = alternatives.near.length + alternatives.week.length + alternatives.month.length;
  let usedRatesFallback = false;
  if (heatmapResultCount === 0 && !isTimedOut(startTime)) {
    usedRatesFallback = true;
    const fallbackOffsets = [-3, -2, -1, 1, 2, 3, -7, 7];
    const fallbackTasks = fallbackOffsets
      .map((offset) => {
        const ci = addDays(checkIn, offset);
        const co = addDays(ci, nights);
        if (ci < today) return null;
        return { checkIn: ci, checkOut: co, offset };
      })
      .filter(Boolean);

    for (let i = 0; i < fallbackTasks.length; i += 5) {
      if (isTimedOut(startTime)) break;
      const batch = fallbackTasks.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (task) => {
          const result = await getCachedRates({ hotelKey, checkIn: task.checkIn, checkOut: task.checkOut, timeoutMs: BATCH_TIMEOUT_MS });
          const rates = getVerifiedRateObservations(result);
          if (rates.length === 0) return null;
          return { ...task, ...rates[0], price: rates[0].total };
        })
      );

      for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value) continue;
        const alt = r.value;
        const bracket = classifyBracket(alt.offset);
        alternatives[bracket].push({
          checkIn: alt.checkIn,
          checkOut: alt.checkOut,
          price: alt.price,
          provider: alt.provider,
          source: alt.source,
          freshness: alt.freshness,
          partial: alt.partial,
          lastCheckedAt: alt.lastCheckedAt,
          priceAccuracyState: alt.priceAccuracyState,
          priceSource: 'provider-rate',
          priceSourceLabel: 'Verified provider rate',
          bookingProvider: true,
          savings: originalPrice ? Number((originalPrice - alt.price).toFixed(2)) : 0,
          savingsPct: originalPrice ? Math.round(((originalPrice - alt.price) / originalPrice) * 100) : 0,
        });
      }
    }
  }

  // 7. Sort each bracket by price
  for (const bracket of Object.keys(alternatives)) {
    alternatives[bracket].sort((a, b) => a.price - b.price);
  }

  // 8. Find cheapest overall
  const allAlternatives = [...alternatives.near, ...alternatives.week, ...alternatives.month];
  const cheapestOverall = allAlternatives.length > 0
    ? allAlternatives.reduce((min, alt) => (alt.price < min.price ? alt : min))
    : null;
  const hasRealData = Boolean(originalPrice || allAlternatives.length > 0);

  return {
    originalDates: { checkIn, checkOut, nights },
    originalPrice,
    originalProvider,
    originalSource,
    alternatives,
    cheapestOverall,
    hasRealData,
    dataPolicy: DATA_POLICY,
    method: heatmapResultCount > 0
      ? 'heatmap-source-observations'
      : usedRatesFallback
        ? 'provider-rates-fallback'
        : 'unavailable',
    availabilityReason: hasRealData ? null : 'No verified provider or price-source observations are available for these dates',
    elapsedMs: Date.now() - startTime,
    timedOut: isTimedOut(startTime),
  };
}
