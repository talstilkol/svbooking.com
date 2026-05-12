import { getCachedHeatmap } from '@/lib/price-cache';
import { HOTELS } from '@/lib/hotels-catalog';

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Heatmap-based scanning: 2-3 calls per hotel covers entire horizon
async function scanHotelViaHeatmap(hotel, horizonDays) {
  const today = new Date().toISOString().split('T')[0];
  const defaultNights = 2;

  // Strategic checkout dates — each heatmap call returns prices for many check-in dates
  const checkOuts = [
    { checkOut: addDays(today, 14 + defaultNights), label: 'next-2-weeks' },
    { checkOut: addDays(today, 30 + defaultNights), label: '1-month' },
  ];
  if (horizonDays >= 60) {
    checkOuts.push({ checkOut: addDays(today, 60 + defaultNights), label: '2-months' });
  }

  const results = [];

  for (const { checkOut, label } of checkOuts) {
    try {
      const result = await getCachedHeatmap({ hotelKey: hotel.hotelKey, checkOut });
      if (!result) continue;

      const rates = result.rates || result.data || [];
      if (!Array.isArray(rates)) continue;

      for (const entry of rates) {
        const checkIn = entry.chk_in || entry.date;
        const totalPrice = Number(entry.rate || entry.price || entry.min_rate || 0);
        if (!checkIn || totalPrice <= 0) continue;

        // Only future dates
        if (checkIn < today) continue;

        const nights = Math.round(
          (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
        );
        // Focus on 1-4 night stays for comparable deals
        if (nights < 1 || nights > 4) continue;

        results.push({
          hotel,
          checkIn,
          checkOut,
          price: totalPrice,
          pricePerNight: Number((totalPrice / nights).toFixed(2)),
          provider: 'Best Available',
          label,
          providerCount: 1,
        });
      }
    } catch {
      // skip failed heatmap calls
    }
  }

  return results;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || '5'), 10);
    const horizon = Math.min(Number(searchParams.get('horizon') || '30'), 90);

    const sampleHotels = HOTELS.slice(0, 8);
    const allDeals = [];

    const batchSize = 4;
    for (let i = 0; i < sampleHotels.length; i += batchSize) {
      const batch = sampleHotels.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((hotel) => scanHotelViaHeatmap(hotel, horizon))
      );
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          allDeals.push(...result.value);
        }
      }
    }

    allDeals.sort((a, b) => a.pricePerNight - b.pricePerNight);

    const topDeals = allDeals.slice(0, limit).map((deal) => {
      const avgPrice = allDeals
        .filter((d) => d.hotel.hotelKey === deal.hotel.hotelKey)
        .reduce((sum, d) => sum + d.pricePerNight, 0) / Math.max(1, allDeals.filter((d) => d.hotel.hotelKey === deal.hotel.hotelKey).length);

      const savingsPct = avgPrice > 0 ? Math.round(((avgPrice - deal.pricePerNight) / avgPrice) * 100) : 0;

      const daysUntil = Math.round((new Date(deal.checkIn) - new Date()) / (1000 * 60 * 60 * 24));
      let urgency = 'low';
      if (daysUntil <= 7) urgency = 'high';
      else if (daysUntil <= 14) urgency = 'medium';

      return {
        ...deal,
        averagePricePerNight: Number(avgPrice.toFixed(2)),
        savingsPct: Math.max(0, savingsPct),
        urgency,
      };
    });

    return Response.json({
      scannedAt: new Date().toISOString(),
      hotelsScanned: sampleHotels.length,
      dealsFound: allDeals.length,
      topDeals,
    });
  } catch (err) {
    console.error('GET /api/agents/deals error:', err);
    return Response.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
