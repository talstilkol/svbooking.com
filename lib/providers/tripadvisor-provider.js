/**
 * TripAdvisor Provider via RapidAPI — Native TripAdvisor ID support
 * Free tier: 500 requests/month
 * Set RAPIDAPI_KEY in .env.local
 *
 * Key advantage: Our hotel keys use TripAdvisor IDs (g{geoId}-d{hotelId}),
 * so we can query by location_id directly — no name matching needed.
 */

const TA_HOST = 'travel-advisor.p.rapidapi.com';

export const tripadvisorProvider = {
  id: 'tripadvisor',
  name: 'TripAdvisor',
  priority: 4,
  monthlyLimit: 500,
  dailyLimit: 20,

  isConfigured() {
    return Boolean(process.env.RAPIDAPI_TRIPADVISOR_KEY || process.env.RAPIDAPI_KEY);
  },

  canHandle({ hotelKey, hotelName, city }) {
    // Direct TA lookup if hotel key has location ID, otherwise need name + city
    return Boolean(hotelKey?.match(/-d\d+/) || (hotelName && city));
  },

  async fetchRates({ hotelKey, hotelName, city, checkIn, checkOut, currency = 'USD', timeoutMs = 8000 }) {
    const apiKey = process.env.RAPIDAPI_TRIPADVISOR_KEY || process.env.RAPIDAPI_KEY;
    if (!apiKey) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Extract TripAdvisor location ID from hotel key (e.g., g294201-d302720 → 302720)
      const taLocationId = hotelKey?.match(/-d(\d+)/)?.[1];

      let url;
      if (taLocationId) {
        // Direct lookup by TripAdvisor location ID (most accurate)
        url = new URL(`https://${TA_HOST}/hotels/get-details`);
        url.searchParams.set('location_id', taLocationId);
        url.searchParams.set('checkin', checkIn);
        url.searchParams.set('adults', '2');
        url.searchParams.set('rooms', '1');
        url.searchParams.set('nights', String(
          Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)
        ));
        url.searchParams.set('currency', currency);
        url.searchParams.set('lang', 'en_US');
      } else if (hotelName && city) {
        // Fallback: search by name
        url = new URL(`https://${TA_HOST}/hotels/list`);
        url.searchParams.set('location_id', '1');
        url.searchParams.set('adults', '2');
        url.searchParams.set('rooms', '1');
        url.searchParams.set('checkin', checkIn);
        url.searchParams.set('nights', String(
          Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)
        ));
        url.searchParams.set('currency', currency);
        url.searchParams.set('lang', 'en_US');
      } else {
        return null;
      }

      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': TA_HOST,
        },
      });
      clearTimeout(timer);
      if (!res.ok) return null;

      const data = await res.json();

      // Parse prices from TripAdvisor response
      const rates = [];

      // Handle direct hotel details response
      const offers = data?.data?.[0]?.hac_offers?.offers || data?.offers || [];
      for (const offer of offers) {
        const price = offer?.display_price_int || offer?.price || offer?.rounded_up_price;
        if (price && price > 0) {
          rates.push({
            name: offer.provider_display_name || offer.vendor || 'TripAdvisor',
            code: offer.vendor?.toLowerCase().replace(/[^a-z]/g, '') || 'tripadvisor',
            rate: Number(price),
            tax: 0,
          });
        }
      }

      // Handle price from hotel listing
      if (rates.length === 0 && data?.data) {
        const hotels = Array.isArray(data.data) ? data.data : [data.data];
        for (const hotel of hotels) {
          const price = hotel?.price || hotel?.display_price_int || hotel?.min_price;
          if (price && price > 0) {
            rates.push({
              name: hotel.provider_name || 'TripAdvisor',
              code: 'tripadvisor',
              rate: Number(price),
              tax: 0,
            });
            break; // Just take the first match
          }
        }
      }

      if (rates.length === 0) return null;

      return {
        rates: rates.sort((a, b) => (a.rate + a.tax) - (b.rate + b.tax)),
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
