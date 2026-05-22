import { kv } from '@/lib/kv';
import { HOTELS } from '@/lib/hotels-catalog';
import { getCachedHeatmap } from '@/lib/price-cache';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { addDays } from '@/lib/utils/date';

const LEGACY_HEATMAP_PROVIDER_LABEL = ['Best', 'Available'].join(' ');
const agentDealsLimiter = rateLimit({ namespace: 'agents-deals', limit: 20, window: 60, failOpen: false });

function normalizeAgentDeal(deal) {
  if (!deal) return null;
  const provider = deal.provider || null;
  const isLegacyHeatmapProvider = provider === LEGACY_HEATMAP_PROVIDER_LABEL;

  return {
    ...deal,
    provider: isLegacyHeatmapProvider ? null : provider,
    priceSource: deal.priceSource || (isLegacyHeatmapProvider ? 'xotelo-heatmap' : null),
    priceSourceLabel: deal.priceSourceLabel || (isLegacyHeatmapProvider ? 'Xotelo heatmap observation' : undefined),
    providerCount: Number(deal.providerCount || 0),
  };
}

// Quick heatmap scan for a single hotel (fallback when no cached deals)
async function quickScanHotel(hotel) {
  const today = new Date().toISOString().split('T')[0];
  const defaultNights = 2;
  const checkOuts = [
    addDays(today, 14 + defaultNights),
    addDays(today, 30 + defaultNights),
  ];

  let bestDeal = null;
  let bestPPN = Infinity;

  for (const checkOut of checkOuts) {
    try {
      const result = await getCachedHeatmap({ hotelKey: hotel.hotelKey, checkOut });
      if (!result) continue;
      const rates = result.rates || result.data || [];
      if (!Array.isArray(rates)) continue;

      for (const entry of rates) {
        const checkIn = entry.chk_in || entry.date;
        const totalPrice = Number(entry.rate || entry.price || entry.min_rate || 0);
        if (!checkIn || totalPrice <= 0 || checkIn < today) continue;
        const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
        if (nights < 1 || nights > 4) continue;
        const ppn = totalPrice / nights;
        if (ppn < bestPPN) {
          bestPPN = ppn;
          bestDeal = {
            hotel,
            checkIn,
            checkOut,
            price: totalPrice,
            pricePerNight: Number(ppn.toFixed(2)),
            provider: null,
            priceSource: 'xotelo-heatmap',
            priceSourceLabel: 'Xotelo heatmap observation',
            nights,
            providerCount: 0,
          };
        }
      }
    } catch { /* skip */ }
  }
  return bestDeal;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || '10'), 20);

    // 1. Try to serve from deal-scanner agent cache (covers the full catalog)
    try {
      const cachedDeals = await kv.get('agent:deals:top');
      if (cachedDeals && Array.isArray(cachedDeals) && cachedDeals.length > 0) {
        const agentStatus = await kv.get('agent:status:deal-scanner');
        return Response.json({
          scannedAt: agentStatus?.completedAt || agentStatus?.startedAt || new Date().toISOString(),
          hotelsScanned: HOTELS.length,
          dealsFound: cachedDeals.length,
          topDeals: cachedDeals.map(normalizeAgentDeal).filter(Boolean).slice(0, limit),
          source: 'agent-cache',
        });
      }
    } catch { /* cache miss, fall through to live scan */ }

    // 2. Fallback: quick live scan of a bounded hotel subset (when agent has not run yet)
    const ip = getClientIp(request);
    const { success, reset } = await agentDealsLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const subsetHotels = HOTELS.slice(0, 12);
    const results = await Promise.allSettled(
      subsetHotels.map((hotel) => quickScanHotel(hotel))
    );

    const deals = results
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value)
      .map(normalizeAgentDeal)
      .filter(Boolean)
      .sort((a, b) => a.pricePerNight - b.pricePerNight);

    return Response.json({
      scannedAt: new Date().toISOString(),
      hotelsScanned: subsetHotels.length,
      dealsFound: deals.length,
      topDeals: deals.slice(0, limit),
      source: 'live-scan',
    });
  } catch (err) {
    console.error('GET /api/agents/deals error:', err);
    return Response.json(
      { error: 'Deals unavailable' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
