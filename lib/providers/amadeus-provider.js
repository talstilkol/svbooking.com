/**
 * Amadeus Hotel Search Provider — Professional GDS hotel pricing
 *
 * Free tier: ~500 calls/month (test + production)
 * Requires AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET in .env.local
 * Free signup at: https://developers.amadeus.com/
 *
 * Uses OAuth 2.0 client_credentials flow. Tokens expire every 30 min.
 * Returns hotel offers from the Amadeus GDS (Global Distribution System).
 */

const TOKEN_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const HOTEL_OFFERS_URL = 'https://test.api.amadeus.com/v3/shopping/hotel-offers';
const HOTEL_LIST_URL = 'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city';

// In-memory token cache
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Get or refresh OAuth token
 */
async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in || 1799) * 1000;
    return cachedToken;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// IATA city codes for common cities (Amadeus uses IATA codes)
const CITY_IATA = {
  'paris': 'PAR', 'london': 'LON', 'rome': 'ROM', 'barcelona': 'BCN',
  'amsterdam': 'AMS', 'prague': 'PRG', 'vienna': 'VIE', 'istanbul': 'IST',
  'dubai': 'DXB', 'tel aviv': 'TLV', 'jerusalem': 'JRS', 'bangkok': 'BKK',
  'phuket': 'HKT', 'singapore': 'SIN', 'bali': 'DPS', 'tokyo': 'TYO',
  'sydney': 'SYD', 'new york': 'NYC', 'miami': 'MIA', 'las vegas': 'LAS',
  'berlin': 'BER', 'munich': 'MUC', 'lisbon': 'LIS', 'athens': 'ATH',
  'budapest': 'BUD', 'helsinki': 'HEL', 'cairo': 'CAI', 'nairobi': 'NBO',
  'seoul': 'SEL', 'toronto': 'YTO', 'melbourne': 'MEL', 'brisbane': 'BNE',
  'perth': 'PER', 'madrid': 'MAD', 'milan': 'MIL', 'florence': 'FLR',
  'dublin': 'DUB', 'copenhagen': 'CPH', 'stockholm': 'STO', 'oslo': 'OSL',
  'zurich': 'ZRH', 'hong kong': 'HKG', 'osaka': 'OSA', 'kyoto': 'KIX',
  'mumbai': 'BOM', 'hanoi': 'HAN', 'san francisco': 'SFO', 'los angeles': 'LAX',
  'chicago': 'CHI', 'cancun': 'CUN', 'buenos aires': 'BUE', 'rio de janeiro': 'RIO',
  'marrakech': 'RAK', 'cape town': 'CPT',
};

export const amadeusProvider = {
  id: 'amadeus',
  name: 'Amadeus GDS',
  priority: 6,
  monthlyLimit: 500,
  dailyLimit: 30,

  isConfigured() {
    return Boolean(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
  },

  /** Pre-flight check: only cities with known IATA codes are supported */
  canHandle({ city }) {
    return Boolean(city && CITY_IATA[city.toLowerCase()]);
  },

  async fetchRates({ hotelName, city, checkIn, checkOut, currency = 'USD', timeoutMs = 8000 }) {
    const token = await getToken();
    if (!token || !city || !checkIn || !checkOut) return null;

    const cityCode = CITY_IATA[city.toLowerCase()];
    if (!cityCode) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Step 1: Find hotels in the city
      const listUrl = new URL(HOTEL_LIST_URL);
      listUrl.searchParams.set('cityCode', cityCode);
      listUrl.searchParams.set('radius', '20');
      listUrl.searchParams.set('radiusUnit', 'KM');

      const listRes = await fetch(listUrl.toString(), {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!listRes.ok) {
        clearTimeout(timer);
        return null;
      }

      const listData = await listRes.json();
      const hotels = listData?.data || [];
      if (hotels.length === 0) {
        clearTimeout(timer);
        return null;
      }

      // Find best match by name
      const nameNorm = (hotelName || '').toLowerCase();
      const match = hotels.find(
        (h) => h.name?.toLowerCase().includes(nameNorm) || nameNorm.includes(h.name?.toLowerCase())
      ) || hotels[0];

      // Step 2: Get offers for the matched hotel
      const offersUrl = new URL(HOTEL_OFFERS_URL);
      offersUrl.searchParams.set('hotelIds', match.hotelId);
      offersUrl.searchParams.set('checkInDate', checkIn);
      offersUrl.searchParams.set('checkOutDate', checkOut);
      offersUrl.searchParams.set('adults', '2');
      offersUrl.searchParams.set('roomQuantity', '1');
      offersUrl.searchParams.set('currency', currency);

      const offersRes = await fetch(offersUrl.toString(), {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token}` },
      });
      clearTimeout(timer);

      if (!offersRes.ok) return null;

      const offersData = await offersRes.json();
      const offers = offersData?.data || [];
      if (offers.length === 0) return null;

      const rates = [];
      for (const offer of offers) {
        const offerList = offer.offers || [];
        for (const o of offerList) {
          const price = o.price?.total ? Number(o.price.total) : null;
          if (!price || price <= 0) continue;
          rates.push({
            name: `Amadeus (${o.room?.description?.text?.slice(0, 30) || 'Standard'})`,
            code: 'amadeus',
            rate: price,
            tax: 0,
          });
        }
      }

      if (rates.length === 0) return null;

      return {
        rates: rates.sort((a, b) => a.rate - b.rate).slice(0, 5),
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
