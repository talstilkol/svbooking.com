import { getExchangeRates, convertCurrency } from '@/lib/exchange-rates';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const exchangeRatesLimiter = rateLimit({ namespace: 'exchange-rates', limit: 30, window: 60, failOpen: false });

/**
 * GET /api/exchange-rates?base=USD
 * Returns exchange rates for a base currency.
 *
 * GET /api/exchange-rates?from=USD&to=EUR&amount=100
 * Converts an amount between currencies.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const amount = Number(searchParams.get('amount'));

    const ip = getClientIp(request);
    const { success, reset } = await exchangeRatesLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    // Conversion mode
    if (from && to && amount) {
      const result = await convertCurrency(amount, from.toUpperCase(), to.toUpperCase());
      return Response.json({
        ...result,
        source: result.source || 'configured-exchange-rate-sources',
        sourceStatus: 'available',
        dataPolicy: 'provider-returned-exchange-rates-only',
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      });
    }

    // Rates mode
    const base = (searchParams.get('base') || 'USD').toUpperCase();
    const rates = await getExchangeRates(base);
    return Response.json({
      ...rates,
      source: rates.source || 'configured-exchange-rate-sources',
      sourceStatus: 'available',
      dataPolicy: 'provider-returned-exchange-rates-only',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    console.error('GET /api/exchange-rates error:', err);
    return Response.json(
      {
        error: 'Exchange rates unavailable',
        source: 'configured-exchange-rate-sources',
        sourceStatus: 'unavailable',
        dataPolicy: 'provider-returned-exchange-rates-only',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
