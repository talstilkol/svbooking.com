import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn(async () => body),
  };
}

describe('exchange rate helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('fetches primary exchange rates and reuses the in-memory cache', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ rates: { EUR: 0.92, ILS: 3.65 } }));
    vi.stubGlobal('fetch', fetchMock);
    const { getExchangeRates } = await import('@/lib/exchange-rates');

    const first = await getExchangeRates('USD');
    const second = await getExchangeRates('USD');

    expect(first).toMatchObject({ base: 'USD', cached: false, rates: { EUR: 0.92, ILS: 3.65 } });
    expect(second).toMatchObject({ base: 'USD', cached: true, rates: { EUR: 0.92, ILS: 3.65 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses the fallback exchange source when the primary source fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 503))
      .mockResolvedValueOnce(jsonResponse({ usd: { eur: 0.91, gbp: 0.78 } }));
    vi.stubGlobal('fetch', fetchMock);
    const { getExchangeRates, convertCurrency, getCurrencySymbol } = await import('@/lib/exchange-rates');

    const rates = await getExchangeRates('USD');
    const converted = await convertCurrency(100, 'USD', 'EUR');

    expect(rates.rates).toEqual({ EUR: 0.91, GBP: 0.78 });
    expect(converted).toEqual({ amount: 100, from: 'USD', to: 'EUR', converted: 91, rate: 0.91 });
    expect(getCurrencySymbol('ILS')).toBe('₪');
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
  });

  it('short-circuits same-currency conversion and reports missing rates', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ rates: { EUR: 0.92 } }));
    vi.stubGlobal('fetch', fetchMock);
    const { convertCurrency } = await import('@/lib/exchange-rates');

    await expect(convertCurrency(50, 'USD', 'USD')).resolves.toEqual({
      amount: 50,
      from: 'USD',
      to: 'USD',
      converted: 50,
      rate: 1,
    });
    await expect(convertCurrency(50, 'USD', 'JPY')).rejects.toThrow('No exchange rate found');
  });
});

describe('country metadata helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('loads country metadata by code and derives the primary currency', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      name: { common: 'France', official: 'French Republic' },
      capital: ['Paris'],
      currencies: { EUR: { name: 'Euro', symbol: '€' } },
      languages: { fra: 'French' },
      timezones: ['UTC+01:00'],
      flag: '🇫🇷',
      region: 'Europe',
      subregion: 'Western Europe',
      latlng: [46, 2],
      population: 68000000,
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { getCountryByCode, getPrimaryCurrency } = await import('@/lib/countries');

    await expect(getCountryByCode('fr')).resolves.toMatchObject({
      name: 'France',
      officialName: 'French Republic',
      capital: 'Paris',
      region: 'Europe',
    });
    await expect(getPrimaryCurrency('FR')).resolves.toEqual({ code: 'EUR', name: 'Euro', symbol: '€' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('loads country metadata by name and caches the normalized result', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([{
      name: { common: 'Israel' },
      cca2: 'IL',
      capital: ['Jerusalem'],
      currencies: { ILS: { name: 'Israeli new shekel', symbol: '₪' } },
      languages: { heb: 'Hebrew' },
      timezones: ['UTC+02:00'],
      flag: '🇮🇱',
      region: 'Asia',
      subregion: 'Western Asia',
      latlng: [31.5, 34.75],
    }]));
    vi.stubGlobal('fetch', fetchMock);
    const { getCountryByName } = await import('@/lib/countries');

    const first = await getCountryByName('Israel');
    const second = await getCountryByName('Israel');

    expect(first).toMatchObject({ name: 'Israel', code: 'IL', capital: 'Jerusalem' });
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects missing country inputs and countries without currencies', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ name: { common: 'Antarctica' }, currencies: {} }));
    vi.stubGlobal('fetch', fetchMock);
    const { getCountryByCode, getCountryByName, getPrimaryCurrency } = await import('@/lib/countries');

    await expect(getCountryByCode('')).rejects.toThrow('Country code is required');
    await expect(getCountryByName('')).rejects.toThrow('Country name is required');
    await expect(getPrimaryCurrency('AQ')).resolves.toBeNull();
  });

  it('uses explicit fallbacks for sparse country payloads', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ name: {}, capital: [] }))
      .mockResolvedValueOnce(jsonResponse({ name: {}, capital: [], cca2: 'VA' }));
    vi.stubGlobal('fetch', fetchMock);
    const { getCountryByCode, getCountryByName } = await import('@/lib/countries');

    await expect(getCountryByCode('aq')).resolves.toEqual({
      name: 'AQ',
      officialName: null,
      capital: null,
      currencies: {},
      languages: {},
      timezones: [],
      flag: '',
      region: null,
      subregion: null,
      latlng: null,
      population: null,
    });

    await expect(getCountryByName('Vatican City')).resolves.toEqual({
      name: 'Vatican City',
      code: 'VA',
      capital: null,
      currencies: {},
      languages: {},
      timezones: [],
      flag: '',
      region: null,
      subregion: null,
      latlng: null,
    });
  });

  it('surfaces REST Countries HTTP errors and timeouts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, false, 503)));
    const { getCountryByCode } = await import('@/lib/countries');

    await expect(getCountryByCode('FR')).rejects.toThrow('REST Countries HTTP 503');

    vi.resetModules();
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_input: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));
    const { getCountryByName } = await import('@/lib/countries');
    const request = getCountryByName('France');
    const assertion = expect(request).rejects.toThrow('Countries request timed out');

    await vi.advanceTimersByTimeAsync(8000);
    await assertion;
  });
});
