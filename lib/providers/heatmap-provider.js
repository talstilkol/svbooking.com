/**
 * Heatmap Synthetic Provider — Uses cached Xotelo heatmap data as a fallback price source.
 *
 * When live rate APIs are down or quota-exhausted, this provider derives an approximate
 * nightly rate from pre-cached heatmap data. The heatmap covers many check-in dates at once,
 * so we can interpolate prices for specific date ranges.
 *
 * Priority: 10 (last resort — only used when all real providers fail)
 * Limit: None (reads from local cache, no external calls)
 * Accuracy: Approximate — heatmap prices may differ from live rates by 5-15%
 */

import { kv } from '../kv';

export const heatmapProvider = {
  id: 'heatmap-cache',
  name: 'Cached Heatmap Estimate',
  priority: 10,           // Lowest priority — last resort fallback
  monthlyLimit: 0,        // Unlimited (reads from cache only)
  dailyLimit: 0,

  isConfigured() {
    return true; // Always available if cache has data
  },

  async fetchRates({ hotelKey, checkIn, checkOut, currency = 'USD' }) {
    if (!hotelKey || !checkIn || !checkOut) return null;

    const nights = Math.round(
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    );
    if (nights < 1 || nights > 30) return null;

    // Try to find heatmap data that covers our check-in date
    // Heatmap keys: "heatmap:{hotelKey}:{checkOut}"
    // We'll try a few checkout dates that might contain our check-in
    const candidateCheckouts = [
      checkOut,
      addDays(checkOut, 1),
      addDays(checkOut, -1),
      addDays(checkIn, 2),  // For short stays, checkout is checkIn + nights
      addDays(checkIn, 3),
    ];

    for (const co of candidateCheckouts) {
      const cacheKey = `heatmap:${hotelKey}:${co}`;
      try {
        const cached = await kv.get(cacheKey);
        if (!cached) continue;

        const rates = cached.rates || cached.data || [];
        if (!Array.isArray(rates)) continue;

        // Look for a rate matching our check-in date
        for (const entry of rates) {
          const entryCheckIn = entry.chk_in || entry.date;
          if (entryCheckIn !== checkIn) continue;

          const totalPrice = Number(entry.rate || entry.price || entry.min_rate || 0);
          if (totalPrice <= 0) continue;

          // Calculate the heatmap's implicit nights for this entry
          const heatmapNights = Math.round(
            (new Date(co) - new Date(entryCheckIn)) / (1000 * 60 * 60 * 24)
          );
          if (heatmapNights < 1) continue;

          // Derive per-night rate and scale to our stay length
          const perNight = totalPrice / heatmapNights;
          const estimatedTotal = Number((perNight * nights).toFixed(2));

          return {
            rates: [{
              name: 'Estimated (Heatmap)',
              code: 'heatmap-estimate',
              rate: estimatedTotal,
              tax: 0,
            }],
            currency,
            chk_in: checkIn,
            chk_out: checkOut,
            approximate: true,
          };
        }
      } catch {
        // Cache read failed, try next
      }
    }

    // No heatmap data found for this hotel/dates
    return null;
  },
};

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
