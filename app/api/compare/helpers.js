/**
 * Shared helpers for compare API routes (single + batch).
 * Rate normalization, scoring, and deduplication.
 */

export function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function fallbackCode(provider, index) {
  return String(provider || `provider-${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '-') || `provider-${index + 1}`;
}

/**
 * Compute a quality score (0-100) for a rate based on data completeness and freshness.
 * Higher score = more reliable price observation.
 */
export function computeRateScore(rate, result) {
  let score = 50; // Base score for having a total price

  // Freshness bonus
  const freshness = rate?.freshness || result?.freshness;
  if (freshness === 'live') score += 20;
  else if (freshness === 'fresh') score += 10;
  else if (freshness === 'stale') score -= 10;

  // Tax clarity bonus
  if (rate?.taxesIncluded === true || rate?.taxesIncluded === false) score += 10;

  // Has separate tax amount
  if (toNumber(rate?.tax) > 0) score += 5;

  // Deep link available (verifiable)
  if (rate?.deepLink) score += 5;

  // Room name specified
  if (rate?.roomName) score += 5;

  // Not partial
  if (!rate?.partial && !result?.partial) score += 5;

  return Math.max(0, Math.min(100, score));
}

export function normalizePublicRate(rate, result, index) {
  const provider = rate?.provider || rate?.name || result?.provider || result?.source || 'Unknown provider';
  const baseRate = toNumber(rate?.rate);
  const tax = toNumber(rate?.tax);
  const total = toNumber(rate?.total) || baseRate + tax;

  const normalized = {
    provider,
    code: rate?.code || fallbackCode(provider, index),
    rate: baseRate,
    tax,
    total,
    currency: rate?.currency || result?.currency || 'USD',
    source: rate?.source || result?.source || null,
    freshness: rate?.freshness || result?.freshness || 'unknown',
    partial: Boolean(rate?.partial ?? result?.partial),
    deepLink: rate?.deepLink || null,
    taxesIncluded: rate?.taxesIncluded ?? result?.taxesIncluded ?? null,
    cancellationPolicy: rate?.cancellationPolicy || null,
    roomName: rate?.roomName || null,
    lastCheckedAt: rate?.lastCheckedAt || result?.lastCheckedAt || null,
    priceAccuracyState: rate?.priceAccuracyState || 'unobserved',
  };

  normalized.score = computeRateScore(normalized, result);
  normalized.scoreBasis = normalized.score >= 70 ? 'high' : normalized.score >= 40 ? 'medium' : 'low';

  return normalized;
}

/**
 * Deduplicate rates by OTA code. When multiple rates share the same code,
 * keep the cheapest. Ties broken by quality score.
 */
export function deduplicateByOTA(rates) {
  const byCode = new Map();
  for (const rate of rates) {
    const existing = byCode.get(rate.code);
    if (!existing || rate.total < existing.total ||
        (rate.total === existing.total && rate.score > existing.score)) {
      byCode.set(rate.code, rate);
    }
  }
  return Array.from(byCode.values());
}

/**
 * Build a normalized comparison response from raw cached rates result.
 */
export function buildComparisonResponse({ result, hotel, checkIn, checkOut, currency, nights }) {
  const rates = deduplicateByOTA(
    (result?.rates || [])
      .map((r, index) => {
        const normalized = normalizePublicRate(r, result, index);
        normalized.perNight = Number((normalized.total / nights).toFixed(2));
        return normalized;
      })
      .filter((r) => r.total > 0)
  ).sort((a, b) => a.total - b.total);

  const cheapest = rates[0] || null;
  const mostExpensive = rates[rates.length - 1] || null;
  const savingsPct =
    cheapest && mostExpensive && mostExpensive.total > 0
      ? Math.round(((mostExpensive.total - cheapest.total) / mostExpensive.total) * 100)
      : 0;

  return {
    hotel,
    checkIn: result?.chk_in || checkIn,
    checkOut: result?.chk_out || checkOut,
    nights,
    currency: result?.currency || currency,
    rates,
    cheapest,
    mostExpensive,
    savingsPct,
    savingsAmount: cheapest && mostExpensive ? Number((mostExpensive.total - cheapest.total).toFixed(2)) : 0,
    providerCount: rates.length,
    fromCache: Boolean(result?.fromCache),
    freshness: result?.freshness || 'unknown',
    partial: Boolean(result?.partial),
    source: result?.source || null,
    providerSource: result?.provider || null,
    mergedProviders: result?.mergedProviders || 1,
    lastCheckedAt: result?.lastCheckedAt || null,
  };
}
