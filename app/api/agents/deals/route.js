import { getRates } from '@/lib/xotelo';
import { HOTELS } from '@/lib/hotels-catalog';

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function scanHotelDeals(hotel, horizonDays) {
  const today = new Date().toISOString().split('T')[0];
  const windows = [
    { checkIn: addDays(today, 7), checkOut: addDays(today, 9), label: 'next-week' },
    { checkIn: addDays(today, 14), checkOut: addDays(today, 16), label: '2-weeks' },
    { checkIn: addDays(today, 30), checkOut: addDays(today, 32), label: '1-month' },
  ];

  if (horizonDays >= 60) {
    windows.push({ checkIn: addDays(today, 60), checkOut: addDays(today, 62), label: '2-months' });
  }

  const results = [];

  for (const window of windows) {
    try {
      const result = await getRates({ hotelKey: hotel.hotelKey, checkIn: window.checkIn, checkOut: window.checkOut });
      const rates = (result?.rates || [])
        .map((r) => ({
          provider: r.name,
          total: Number(r.rate || 0) + Number(r.tax || 0),
        }))
        .filter((r) => r.total > 0)
        .sort((a, b) => a.total - b.total);

      if (rates.length > 0) {
        results.push({
          hotel,
          checkIn: window.checkIn,
          checkOut: window.checkOut,
          price: rates[0].total,
          pricePerNight: Number((rates[0].total / 2).toFixed(2)),
          provider: rates[0].provider,
          label: window.label,
          providerCount: rates.length,
        });
      }
    } catch {
      // skip failed windows
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
        batch.map((hotel) => scanHotelDeals(hotel, horizon))
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
