/**
 * Xotelo Provider — Primary pricing source (free, no auth, native hotel_key support)
 * Returns real-time prices from Booking.com, Expedia, Hotels.com, Agoda, Vio, etc.
 */

import { getRates } from '../xotelo';

export const xoteloProvider = {
  id: 'xotelo',
  name: 'Xotelo',
  priority: 1,             // Highest priority (free, no auth, best match)
  monthlyLimit: 0,         // No known limit (0 = unlimited)
  dailyLimit: 0,

  isConfigured() {
    return true; // Always available, no auth needed
  },

  async fetchRates({ hotelKey, checkIn, checkOut, currency = 'USD' }) {
    if (!hotelKey || !checkIn || !checkOut) return null;

    const result = await getRates({ hotelKey, checkIn, checkOut, currency, timeoutMs: 12000 });
    if (!result?.rates?.length) return null;

    return {
      rates: result.rates.map((r) => ({
        name: r.name,
        code: r.code || r.name?.toLowerCase().replace(/[^a-z]/g, ''),
        rate: Number(r.rate || 0),
        tax: Number(r.tax || 0),
      })),
      currency: result.currency || currency,
      chk_in: checkIn,
      chk_out: checkOut,
    };
  },
};
