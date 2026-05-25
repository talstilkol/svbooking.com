/**
 * Booking.com Provider via RapidAPI — Real Booking.com data
 * Free tier: 500 requests/month (sign up at rapidapi.com)
 * Set RAPIDAPI_KEY in .env.local
 *
 * Uses the "Booking.com" API by apidojo on RapidAPI.
 */

const BOOKING_HOST = 'booking-com.p.rapidapi.com';

export const bookingProvider = {
  id: 'booking',
  name: 'Booking.com',
  priority: 3,
  monthlyLimit: 500,
  dailyLimit: 20,           // Conservative daily cap

  isConfigured() {
    return Boolean(process.env.RAPIDAPI_BOOKING_KEY || process.env.RAPIDAPI_KEY);
  },

  canHandle({ hotelName, city }) {
    return Boolean(hotelName && city);
  },

  async fetchRates({ hotelName, city, checkIn, checkOut, currency = 'USD', timeoutMs = 8000 }) {
    const apiKey = process.env.RAPIDAPI_BOOKING_KEY || process.env.RAPIDAPI_KEY;
    if (!apiKey || !hotelName || !city) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Step 1: Search for the hotel
      const searchUrl = new URL(`https://${BOOKING_HOST}/v1/hotels/search`);
      searchUrl.searchParams.set('checkin_date', checkIn);
      searchUrl.searchParams.set('checkout_date', checkOut);
      searchUrl.searchParams.set('adults_number', '2');
      searchUrl.searchParams.set('room_number', '1');
      searchUrl.searchParams.set('dest_type', 'city');
      searchUrl.searchParams.set('locale', 'en-us');
      searchUrl.searchParams.set('units', 'metric');
      searchUrl.searchParams.set('order_by', 'review_score');
      searchUrl.searchParams.set('filter_by_currency', currency);
      searchUrl.searchParams.set('dest_id', city);      // Will be city name for search
      searchUrl.searchParams.set('page_number', '0');

      const res = await fetch(searchUrl.toString(), {
        signal: controller.signal,
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': BOOKING_HOST,
        },
      });
      clearTimeout(timer);
      if (!res.ok) return null;

      const data = await res.json();
      const results = data?.result || [];
      if (results.length === 0) return null;

      // Find best match by name
      const nameNorm = hotelName.toLowerCase();
      const match = results.find(
        (r) => r.hotel_name?.toLowerCase().includes(nameNorm) || nameNorm.includes(r.hotel_name?.toLowerCase())
      ) || results[0];

      const price = match.min_total_price || match.composite_price_breakdown?.gross_amount?.value;
      if (!price || price <= 0) return null;

      return {
        rates: [{
          name: 'Booking.com',
          code: 'bookingcom',
          rate: Number(price),
          tax: 0,
        }],
        currency: match.currency_code || currency,
        chk_in: checkIn,
        chk_out: checkOut,
      };
    } catch {
      clearTimeout(timer);
      return null;
    }
  },
};
