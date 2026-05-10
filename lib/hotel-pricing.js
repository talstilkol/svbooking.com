// Hotel pricing aggregator — tries available backends in order.
// Primary: Xotelo (free, no auth, best coverage for Europe/US/Asia)
// Secondary: Makcorps via RapidAPI (set MAKCORPS_API_KEY env var, free tier = 100 req/month)
//
// To add Makcorps: sign up at https://rapidapi.com/makcorps-makcorps-default/api/hotels-com-provider
// Then set MAKCORPS_API_KEY in .env.local

import { getRates as getXoteloRates } from './xotelo';

async function getMakcorpsRates({ hotelName, city, checkIn, checkOut }) {
  const apiKey = process.env.MAKCORPS_API_KEY;
  if (!apiKey) return null;

  try {
    const query = encodeURIComponent(`${hotelName} ${city}`);
    const url = `https://hotels-com-provider.p.rapidapi.com/v2/hotels/search?domain=com&sort_order=REVIEW&locale=en_US&checkout_date=${checkOut}&region_id=0&adults_number=2&checkin_date=${checkIn}&query=${query}`;
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'hotels-com-provider.p.rapidapi.com',
      },
    });
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
        rate: price,
        tax: 0,
      }],
      currency: 'USD',
      chk_in: checkIn,
      chk_out: checkOut,
      source: 'makcorps',
    };
  } catch {
    return null;
  }
}

export async function getHotelRates({ hotelKey, hotelName, city, checkIn, checkOut, currency = 'USD' }) {
  // Try Xotelo first (free, no auth)
  try {
    const xoteloResult = await getXoteloRates({ hotelKey, checkIn, checkOut, currency });
    if (xoteloResult?.rates?.length > 0) {
      return { ...xoteloResult, source: 'xotelo' };
    }
  } catch {
    // Xotelo failed, try fallback
  }

  // Try Makcorps if configured
  if (hotelName && city) {
    const makcorpsResult = await getMakcorpsRates({ hotelName, city, checkIn, checkOut });
    if (makcorpsResult) return makcorpsResult;
  }

  // No rates from any provider
  return { rates: [], currency, chk_in: checkIn, chk_out: checkOut, source: 'none' };
}
