import { getCachedRates } from '@/lib/price-cache';
import { getVerifiedRateObservations } from '@/lib/cheaper-dates';
import { findHotel } from '@/lib/hotels-catalog';
import { ValidationError, errorResponse, parseDate } from '@/lib/validation';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const agentLimiter = rateLimit({ namespace: 'agent', limit: 20, window: 60, failOpen: false });

function priceScore(rate, cheapestPrice, mostExpensivePrice) {
  const range = Math.max(1, mostExpensivePrice - cheapestPrice);
  return Number((1 - (rate.total - cheapestPrice) / range).toFixed(3));
}

function buildRecommendation(rates) {
  if (rates.length === 0) {
    return {
      recommended: null,
      reasoning: 'No provider-returned offers are available for these dates. Try different dates or another hotel.',
      verdict: 'NO_DATA',
    };
  }

  const cheapestPrice = rates[0].total;
  const mostExpensivePrice = rates[rates.length - 1].total;

  const ranked = [...rates]
    .map((r) => ({ ...r, score: priceScore(r, cheapestPrice, mostExpensivePrice), scoreBasis: 'verified-price' }))
    .sort((a, b) => a.total - b.total);

  const winner = ranked[0];
  const savingsVsExpensive = mostExpensivePrice - cheapestPrice;
  const savingsPct = mostExpensivePrice > 0 ? Math.round((savingsVsExpensive / mostExpensivePrice) * 100) : 0;

  return {
    recommended: winner,
    cheapest: ranked[0],
    mostExpensive: rates[rates.length - 1],
    ranked,
    savingsVsExpensive: Number(savingsVsExpensive.toFixed(2)),
    savingsPct,
    reasoning: `${winner.provider} has the lowest verified total at $${winner.total.toFixed(2)} for the selected dates. This recommendation is based on provider-returned price only; verified provider-quality data is unavailable.`,
    verdict: 'LOWEST_VERIFIED_PRICE',
  };
}

export async function handlePriceRecommendationRequest(request) {
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

    const hotel = findHotel(hotelKey);
    if (!hotel) {
      throw new ValidationError('Hotel not found', 404);
    }

    const ip = getClientIp(request);
    const { success, reset } = await agentLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const result = await getCachedRates({
      hotelKey,
      hotelName: hotel.name,
      city: hotel.city,
      checkIn,
      checkOut,
    });
    const rates = getVerifiedRateObservations(result)
      .map((r) => ({
        ...r,
        rate: r.rate,
        tax: r.tax,
        currency: r.currency || result.currency || 'USD',
      }));

    return Response.json({
      hotel,
      checkIn: result?.chk_in || checkIn,
      checkOut: result?.chk_out || checkOut,
      currency: result?.currency || 'USD',
      providerCount: rates.length,
      priceMeta: {
        provider: result?.provider || null,
        source: result?.source || null,
        fromCache: Boolean(result?.fromCache),
        freshness: result?.freshness || 'unknown',
        partial: Boolean(result?.partial),
        lastCheckedAt: result?.lastCheckedAt || null,
      },
      ...buildRecommendation(rates),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
