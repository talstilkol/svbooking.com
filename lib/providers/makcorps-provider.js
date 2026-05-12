/**
 * Makcorps / Hotels.com Provider via RapidAPI
 * Free tier: 100 requests/month
 * Set MAKCORPS_API_KEY in .env.local
 *
 * Searches Hotels.com data for pricing.
 */

const MAKCORPS_HOST = 'hotels-com-provider.p.rapidapi.com';

export const makcorpsProvider = {
  id: 'makcorps',
  name: 'Hotels.com (Makcorps)',
  priority: 5,
  monthlyLimit: 100,
  dailyLimit: 10,

  isConfigured() {
    return Boolean(process.env.MAKCORPS_API_KEY);
  },

  async fetchRates({ hotelName, city, checkIn, checkOut, currency = 'USD' }) {
    const apiKey = process.env.MAKCORPS_API_KEY;
    if (!apiKey || !hotelName || !city) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const query = encodeURIComponent(`${hotelName} ${city}`);
      const url = `https://${MAKCORPS_HOST}/v2/hotels/search?domain=com&sort_order=REVIEW&locale=en_US&checkout_date=${checkOut}&region_id=0&adults_number=2&checkin_date=${checkIn}&query=${query}`;

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': MAKCORPS_HOST,
        },
      });
      clearTimeout(timer);
      if (!res.ok) return null;

      const data = await res.json();
      const properties = data?.properties || [];
      if (properties.length === 0) return null;

      const match = properties[0];
      const price = match?.price?.lead?.amount;
      if (!price) return null;

      return {
        rates: [{
          name: 'Hotels.com',
          code: 'hotelscom',
          rate: Number(price),
          tax: 0,
        }],
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
