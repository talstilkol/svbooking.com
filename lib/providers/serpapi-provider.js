/**
 * SerpApi Google Hotels Provider — requests Google Hotels pricing results
 * Free tier: 250 searches/month (sign up at serpapi.com)
 * Set SERPAPI_KEY in .env.local
 *
 * Returns prices from OTAs aggregated by Google when the API responds.
 */

const SERPAPI_BASE = 'https://serpapi.com/search';

export const serpapiProvider = {
  id: 'serpapi',
  name: 'Google Hotels (SerpApi)',
  priority: 2,
  monthlyLimit: 250,
  dailyLimit: 50,           // Self-imposed daily cap to spread quota

  isConfigured() {
    return Boolean(process.env.SERPAPI_KEY);
  },

  async fetchRates({ hotelName, city, checkIn, checkOut, currency = 'USD', timeoutMs = 12000 }) {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey || !hotelName || !city) return null;

    const query = `${hotelName} ${city}`;
    const url = new URL(SERPAPI_BASE);
    url.searchParams.set('engine', 'google_hotels');
    url.searchParams.set('q', query);
    url.searchParams.set('check_in_date', checkIn);
    url.searchParams.set('check_out_date', checkOut);
    url.searchParams.set('adults', '2');
    url.searchParams.set('currency', currency);
    url.searchParams.set('gl', 'us');
    url.searchParams.set('hl', 'en');
    url.searchParams.set('api_key', apiKey);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return null;

      const data = await res.json();
      const properties = data?.properties || [];
      if (properties.length === 0) return null;

      // Find best match by name similarity
      const nameNorm = hotelName.toLowerCase();
      const match = properties.find(
        (p) => p.name?.toLowerCase().includes(nameNorm) || nameNorm.includes(p.name?.toLowerCase())
      ) || properties[0]; // Fall back to first result

      const rates = [];

      // Main rate
      if (match.rate_per_night?.extracted_lowest) {
        rates.push({
          name: match.rate_per_night?.before_taxes_fees ? 'Google Hotels' : (match.source || 'Google Hotels'),
          code: 'google',
          rate: match.total_rate?.extracted_lowest || match.rate_per_night.extracted_lowest,
          tax: 0,
        });
      }

      // Nearby prices from other sources (if available in detail)
      if (match.nearby_prices) {
        for (const np of match.nearby_prices) {
          if (np.price?.extracted_lowest) {
            rates.push({
              name: np.source || 'Other',
              code: np.source?.toLowerCase().replace(/[^a-z]/g, '') || 'other',
              rate: np.price.extracted_lowest,
              tax: 0,
            });
          }
        }
      }

      if (rates.length === 0) return null;

      return {
        rates,
        currency,
        chk_in: checkIn,
        chk_out: checkOut,
      };
    } catch {
      clearTimeout(timer);
      return null;
    }
  },
};
