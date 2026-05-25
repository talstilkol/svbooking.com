/**
 * Xotelo Provider — pricing source with native hotel_key support.
 * Returns provider price observations when the upstream service has data.
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

  canHandle({ hotelKey }) {
    return Boolean(hotelKey);
  },

  async fetchRates({ hotelKey, checkIn, checkOut, currency = 'USD', timeoutMs = 12000 }) {
    if (!hotelKey || !checkIn || !checkOut) return null;

    const result = await getRates({ hotelKey, checkIn, checkOut, currency, timeoutMs });
    if (!result?.rates?.length) return null;

    return {
      rates: result.rates.map((r) => ({
        name: r.name,
        code: r.code || r.name?.toLowerCase().replace(/[^a-z]/g, ''),
        rate: Number(r.rate || 0),
        tax: Number(r.tax || 0),
        total: Number(r.total || 0) || (Number(r.rate || 0) + Number(r.tax || 0)),
        deepLink: r.url || r.deepLink || null,
        taxesIncluded: r.tax_type === 'included' ? true : r.tax_type === 'excluded' ? false : null,
        roomName: r.room_name || null,
      })),
      currency: result.currency || currency,
      chk_in: checkIn,
      chk_out: checkOut,
    };
  },
};
