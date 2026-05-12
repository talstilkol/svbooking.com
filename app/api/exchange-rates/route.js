import { getExchangeRates, convertCurrency } from '@/lib/exchange-rates';

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

    // Conversion mode
    if (from && to && amount) {
      const result = await convertCurrency(amount, from.toUpperCase(), to.toUpperCase());
      return Response.json(result, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      });
    }

    // Rates mode
    const base = (searchParams.get('base') || 'USD').toUpperCase();
    const rates = await getExchangeRates(base);
    return Response.json(rates, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
