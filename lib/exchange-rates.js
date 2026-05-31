// Free exchange rate API — no auth required.
// Source: open.er-api.com.
// Fallback: cdn.jsdelivr.net/npm/@fawazahmed0/currency-api
//
// Used to convert hotel prices between currencies.

const PRIMARY_URL = 'https://open.er-api.com/v6/latest';
const FALLBACK_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies';

// In-memory cache (rates update daily, no need to fetch every request)
let rateCache = { base: null, rates: null, source: null, fetchedAt: 0 };
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Get exchange rates for a base currency.
 * Returns an object of { currency: rate } pairs.
 *
 * @param {string} [base='USD'] - Base currency code
 * @returns {Promise<{base: string, rates: Record<string, number>, updatedAt: string}>}
 */
export async function getExchangeRates(base = 'USD') {
  const now = Date.now();
  if (rateCache.base === base && rateCache.rates && now - rateCache.fetchedAt < CACHE_TTL) {
    return {
      base: rateCache.base,
      rates: rateCache.rates,
      source: rateCache.source,
      updatedAt: new Date(rateCache.fetchedAt).toISOString(),
      cached: true,
    };
  }

  try {
    const data = await fetchWithTimeout(`${PRIMARY_URL}/${base}`, 8000);
    if (data?.rates) {
      rateCache = { base, rates: data.rates, source: 'open.er-api.com', fetchedAt: now };
      return { base, rates: data.rates, source: rateCache.source, updatedAt: new Date().toISOString(), cached: false };
    }
  } catch {
    // Try fallback
  }

  try {
    const data = await fetchWithTimeout(`${FALLBACK_URL}/${base.toLowerCase()}.json`, 8000);
    const rates = data?.[base.toLowerCase()];
    if (rates) {
      // Normalize keys to uppercase
      const normalized = {};
      for (const [k, v] of Object.entries(rates)) {
        normalized[k.toUpperCase()] = v;
      }
      rateCache = { base, rates: normalized, source: 'currency-api', fetchedAt: now };
      return { base, rates: normalized, source: rateCache.source, updatedAt: new Date().toISOString(), cached: false };
    }
  } catch {
    // Both failed
  }

  throw new Error('Failed to fetch exchange rates from all sources');
}

/**
 * Convert an amount between currencies.
 *
 * @param {number} amount - Amount to convert
 * @param {string} from - Source currency (e.g., 'USD')
 * @param {string} to - Target currency (e.g., 'EUR')
 * @returns {Promise<{amount: number, from: string, to: string, converted: number, rate: number}>}
 */
export async function convertCurrency(amount, from, to) {
  if (from === to) return { amount, from, to, converted: amount, rate: 1, source: 'same-currency' };

  const { rates, source } = await getExchangeRates(from);
  const rate = rates[to.toUpperCase()];
  if (!rate) throw new Error(`No exchange rate found for ${from} → ${to}`);

  return {
    amount,
    from,
    to,
    converted: Math.round(amount * rate * 100) / 100,
    rate,
    source,
  };
}

/**
 * Get currency symbol for a currency code.
 */
export function getCurrencySymbol(code) {
  const symbols = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥',
    ILS: '₪', THB: '฿', KRW: '₩', INR: '₹', AUD: 'A$',
    CAD: 'C$', CHF: 'CHF', SGD: 'S$', HKD: 'HK$', NZD: 'NZ$',
    SEK: 'kr', NOK: 'kr', DKK: 'kr', MXN: 'MX$', BRL: 'R$',
    AED: 'AED', SAR: 'SAR', EGP: 'E£', ZAR: 'R', TRY: '₺',
    MYR: 'RM', PHP: '₱', IDR: 'Rp', COP: 'COP', PEN: 'S/.',
    ARS: 'AR$', CLP: 'CL$', LKR: 'Rs', KES: 'KSh', HRK: 'kn',
    HUF: 'Ft', PLN: 'zł', CZK: 'Kč', RON: 'lei', QAR: 'QAR',
  };
  return symbols[code] || code;
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
