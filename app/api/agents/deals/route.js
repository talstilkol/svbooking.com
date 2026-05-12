import { kv } from '@/lib/kv';
import { HOTELS } from '@/lib/hotels-catalog';
import { getCachedHeatmap } from '@/lib/price-cache';

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
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
          bestDeal = { hotel, checkIn, checkOut, price: totalPrice, pricePerNight: Number(ppn.toFixed(2)), provider: 'Best Available', nights, providerCount: 1 };
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

    // 1. Try to serve from deal-scanner agent cache (covers all 132 hotels)
    try {
      const cachedDeals = await kv.get('agent:deals:top');
      if (cachedDeals && Array.isArray(cachedDeals) && cachedDeals.length > 0) {
        const agentStatus = await kv.get('agent:status:deal-scanner');
        return Response.json({
          scannedAt: agentStatus?.completedAt || agentStatus?.startedAt || new Date().toISOString(),
          hotelsScanned: 132,
          dealsFound: cachedDeals.length,
          topDeals: cachedDeals.slice(0, limit),
          source: 'agent-cache',
        });
      }
    } catch { /* cache miss, fall through to live scan */ }

    // 2. Fallback: quick live scan of a sample (when agent hasn't run yet)
    const sampleHotels = HOTELS.slice(0, 12);
    const results = await Promise.allSettled(
      sampleHotels.map((hotel) => quickScanHotel(hotel))
    );

    const deals = results
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value)
      .sort((a, b) => a.pricePerNight - b.pricePerNight);

    return Response.json({
      scannedAt: new Date().toISOString(),
      hotelsScanned: sampleHotels.length,
      dealsFound: deals.length,
      topDeals: deals.slice(0, limit),
      source: 'live-scan',
    });
  } catch (err) {
    console.error('GET /api/agents/deals error:', err);
    return Response.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
