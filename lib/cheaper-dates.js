import { getCachedHeatmap, getCachedRates } from './price-cache';

/** Maximum total time for the entire findCheaperDates operation */
const TOTAL_TIMEOUT_MS = 45_000; // 45 seconds
/** Per-batch timeout for heatmap requests */
const BATCH_TIMEOUT_MS = 12_000; // 12 seconds per batch

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
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
  if (!heatmapData || !Array.isArray(heatmapData)) return null;

  const targetCheckIn = addDays(checkOutDate, -nights);

  // heatmapData is array of { date, price } or nested structure
  // Xotelo heatmap returns: { daily: [{ date, price }] } or similar
  const entries = Array.isArray(heatmapData) ? heatmapData : heatmapData.daily || [];

  for (const entry of entries) {
    if (entry.date === targetCheckIn && entry.price && entry.price > 0) {
      return {
        checkIn: targetCheckIn,
        checkOut: checkOutDate,
        pricePerNight: Number(entry.price),
        totalPrice: Number((entry.price * nights).toFixed(2)),
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
  const nights = daysBetween(checkIn, checkOut);
  const today = new Date().toISOString().split('T')[0];

  // 1. Get original price via getRates (single call for accurate current price)
  let originalPrice = null;
  let originalProvider = null;
  try {
    const result = await getCachedRates({ hotelKey, checkIn, checkOut, timeoutMs: BATCH_TIMEOUT_MS });
    const rates = (result?.rates || [])
      .map((r) => ({
        provider: r.name,
        total: Number(r.rate || 0) + Number(r.tax || 0),
      }))
      .filter((r) => r.total > 0)
      .sort((a, b) => a.total - b.total);

    if (rates.length > 0) {
      originalPrice = rates[0].total;
      originalProvider = rates[0].provider;
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
      provider: 'Heatmap estimate',
      savings,
      savingsPct,
    });
  }

  // 6. If heatmap yielded no results, fall back to limited getRates calls
  const totalResults = alternatives.near.length + alternatives.week.length + alternatives.month.length;
  if (totalResults === 0 && !isTimedOut(startTime)) {
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
          const rates = (result?.rates || [])
            .map((r) => ({ provider: r.name, total: Number(r.rate || 0) + Number(r.tax || 0) }))
            .filter((r) => r.total > 0)
            .sort((a, b) => a.total - b.total);
          if (rates.length === 0) return null;
          return { ...task, price: rates[0].total, provider: rates[0].provider };
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

  return {
    originalDates: { checkIn, checkOut, nights },
    originalPrice,
    originalProvider,
    alternatives,
    cheapestOverall,
    method: totalResults > 0 ? 'heatmap' : 'rates-fallback',
    elapsedMs: Date.now() - startTime,
    timedOut: isTimedOut(startTime),
  };
}
