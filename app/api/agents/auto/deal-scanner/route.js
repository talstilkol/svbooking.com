// Deal Scanner Agent — Scans ALL catalog hotels via heatmap to find deal candidates.
// Caches top deals globally and per-city for instant /deals page loading.
// Much broader coverage than the manual /api/agents/deals (which only scans 8 hotels).

import { runAgent, verifyCronAuth, withConcurrency, AGENT_NAMES } from '@/lib/agent-utils';
import { getCachedHeatmap } from '@/lib/price-cache';
import { HOTELS } from '@/lib/hotels-catalog';
import { kv } from '@/lib/kv';
import { addDays } from '@/lib/utils/date';

const DEALS_TTL = 14400; // 4 hours

/**
 * Scan a single hotel via heatmap and extract deal candidates.
 */
async function scanHotel(hotel) {
  const today = new Date().toISOString().split('T')[0];
  const defaultNights = 2;

  const checkOuts = [
    addDays(today, 14 + defaultNights),
    addDays(today, 30 + defaultNights),
    addDays(today, 60 + defaultNights),
  ];

  const deals = [];

  for (const checkOut of checkOuts) {
    try {
      const result = await getCachedHeatmap({ hotelKey: hotel.hotelKey, checkOut, timeoutMs: 12000 });
      if (!result) continue;

      const rates = result.rates || result.data || [];
      if (!Array.isArray(rates)) continue;

      for (const entry of rates) {
        const checkIn = entry.chk_in || entry.date;
        const totalPrice = Number(entry.rate || entry.price || entry.min_rate || 0);
        if (!checkIn || totalPrice <= 0) continue;
        if (checkIn < today) continue;

        const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
        if (nights < 1 || nights > 4) continue;

        deals.push({
          hotel: {
            hotelKey: hotel.hotelKey,
            name: hotel.name,
            city: hotel.city,
            country: hotel.country,
            image: hotel.image,
          },
          checkIn,
          checkOut,
          price: totalPrice,
          pricePerNight: Number((totalPrice / nights).toFixed(2)),
          nights,
          provider: null,
          priceSource: 'xotelo-heatmap',
          priceSourceLabel: 'Xotelo heatmap observation',
          currency: 'USD',
        });
      }
    } catch {
      // Skip failed heatmap calls
    }
  }

  return deals;
}

async function runDealScanner() {
  const allDeals = [];

  // Scan ALL catalog hotels in batches of 4
  const results = await withConcurrency(HOTELS, 4, async (hotel) => {
    return await scanHotel(hotel);
  }, 1000);

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      allDeals.push(...r.value);
    }
  }

  // Calculate average per-night price per hotel for savings computation
  const avgByHotel = new Map();
  for (const deal of allDeals) {
    const key = deal.hotel.hotelKey;
    if (!avgByHotel.has(key)) avgByHotel.set(key, []);
    avgByHotel.get(key).push(deal.pricePerNight);
  }

  // Enrich deals with savings info
  const enrichedDeals = allDeals.map((deal) => {
    const prices = avgByHotel.get(deal.hotel.hotelKey) || [deal.pricePerNight];
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    const savingsPct = avg > 0 ? Math.round(((avg - deal.pricePerNight) / avg) * 100) : 0;
    const daysUntil = Math.round((new Date(deal.checkIn) - new Date()) / (1000 * 60 * 60 * 24));

    return {
      ...deal,
      averagePricePerNight: Number(avg.toFixed(2)),
      savingsPct: Math.max(0, savingsPct),
      urgency: daysUntil <= 7 ? 'high' : daysUntil <= 14 ? 'medium' : 'low',
    };
  });

  // Sort by savings percentage (largest observed spread first)
  enrichedDeals.sort((a, b) => b.savingsPct - a.savingsPct);

  // Cache top 20 deals globally
  const topDeals = enrichedDeals.slice(0, 20);
  await kv.setWithTTL('agent:deals:top', topDeals, DEALS_TTL);

  // Cache per-city top deals
  const citiesProcessed = new Set();
  const cityDeals = new Map();
  for (const deal of enrichedDeals) {
    const cityKey = deal.hotel.city.toLowerCase();
    if (!cityDeals.has(cityKey)) cityDeals.set(cityKey, []);
    cityDeals.get(cityKey).push(deal);
    citiesProcessed.add(deal.hotel.city);
  }

  for (const [cityKey, deals] of cityDeals) {
    await kv.setWithTTL(`agent:deals:city:${cityKey}`, deals.slice(0, 10), DEALS_TTL);
  }

  return {
    hotelsScanned: HOTELS.length,
    totalDealsFound: allDeals.length,
    topDealsCached: topDeals.length,
    citiesWithDeals: citiesProcessed.size,
    bestDeal: topDeals[0] ? {
      hotel: topDeals[0].hotel.name,
      city: topDeals[0].hotel.city,
      pricePerNight: topDeals[0].pricePerNight,
      savingsPct: topDeals[0].savingsPct,
    } : null,
  };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const status = await runAgent(AGENT_NAMES.DEAL_SCANNER, runDealScanner);
    return Response.json(status, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('GET /api/agents/auto/deal-scanner error:', err);
    return Response.json(
      { status: 'error', error: 'Deal scanner unavailable' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
