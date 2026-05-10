import { getRates } from '@/lib/xotelo';
import { findHotel } from '@/lib/hotels-catalog';
import { ValidationError, errorResponse, parseDate } from '@/lib/validation';

// Provider trust scores (0-1) — based on general reputation, refund policy, customer service
const PROVIDER_SCORES = {
  'Booking.com': 0.95,
  'Expedia': 0.90,
  'Hotels.com': 0.88,
  'Agoda.com': 0.85,
  'Vio.com': 0.70,
  'Amari.com': 0.80,
  'DerbySoft': 0.75,
  'Trip.com': 0.82,
  'Priceline': 0.80,
};

function trustScore(provider) {
  return PROVIDER_SCORES[provider] ?? 0.65;
}

// Compute a weighted recommendation score combining price + trust
function score(rate, cheapestPrice, mostExpensivePrice) {
  const range = Math.max(1, mostExpensivePrice - cheapestPrice);
  const priceScore = 1 - (rate.total - cheapestPrice) / range; // 1 for cheapest, 0 for most expensive
  const trust = trustScore(rate.provider);
  // Weighted: 65% price, 35% trust
  return Number((priceScore * 0.65 + trust * 0.35).toFixed(3));
}

function buildRecommendation(rates) {
  if (rates.length === 0) {
    return {
      recommended: null,
      reasoning: 'No live offers available for these dates. Try different dates or another hotel.',
      verdict: 'NO_DATA',
    };
  }

  const cheapestPrice = rates[0].total;
  const mostExpensivePrice = rates[rates.length - 1].total;

  const ranked = [...rates]
    .map((r) => ({ ...r, score: score(r, cheapestPrice, mostExpensivePrice), trust: trustScore(r.provider) }))
    .sort((a, b) => b.score - a.score);

  const winner = ranked[0];
  const cheapest = rates[0];

  let reasoning;
  let verdict;

  if (winner.code === cheapest.code) {
    reasoning = `${winner.provider} is both the cheapest at $${winner.total.toFixed(2)} AND a highly trusted provider (trust score ${(winner.trust * 100).toFixed(0)}%). Easy choice — book here.`;
    verdict = 'CHEAPEST_AND_TRUSTED';
  } else {
    const priceDiff = winner.total - cheapest.total;
    const pctMore = ((priceDiff / cheapest.total) * 100).toFixed(1);
    reasoning = `${cheapest.provider} is cheapest ($${cheapest.total.toFixed(2)}), but ${winner.provider} is recommended at $${winner.total.toFixed(2)} (only ${pctMore}% more) because it has a much better trust score (${(winner.trust * 100).toFixed(0)}% vs ${(trustScore(cheapest.provider) * 100).toFixed(0)}%). Worth the small premium for better refund/support policies.`;
    verdict = 'BALANCED';
  }

  const savingsVsExpensive = mostExpensivePrice - cheapestPrice;
  const savingsPct = mostExpensivePrice > 0 ? Math.round((savingsVsExpensive / mostExpensivePrice) * 100) : 0;

  return {
    recommended: winner,
    cheapest,
    mostExpensive: rates[rates.length - 1],
    ranked,
    savingsVsExpensive: Number(savingsVsExpensive.toFixed(2)),
    savingsPct,
    reasoning,
    verdict,
  };
}

// GET /api/agent?hotelKey=...&checkIn=...&checkOut=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelKey = searchParams.get('hotelKey');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');

    if (!hotelKey || !checkIn || !checkOut) {
      throw new ValidationError('Missing required params: hotelKey, checkIn, checkOut');
    }

    const checkInDate = parseDate(checkIn, 'checkIn');
    const checkOutDate = parseDate(checkOut, 'checkOut');
    if (checkInDate >= checkOutDate) {
      throw new ValidationError('checkIn must be before checkOut');
    }

    const result = await getRates({ hotelKey, checkIn, checkOut });
    const rates = (result?.rates || [])
      .map((r) => ({
        provider: r.name,
        code: r.code,
        rate: Number(r.rate || 0),
        tax: Number(r.tax || 0),
        total: Number(r.rate || 0) + Number(r.tax || 0),
        currency: result.currency || 'USD',
      }))
      .filter((r) => r.total > 0)
      .sort((a, b) => a.total - b.total);

    const recommendation = buildRecommendation(rates);
    const hotel = findHotel(hotelKey);

    return Response.json({
      hotel: hotel || { hotelKey, name: 'Hotel' },
      checkIn: result?.chk_in || checkIn,
      checkOut: result?.chk_out || checkOut,
      currency: result?.currency || 'USD',
      providerCount: rates.length,
      ...recommendation,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
