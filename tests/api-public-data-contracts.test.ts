import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getWeather } from '@/app/api/weather/route';
import { GET as getExchangeRatesRoute } from '@/app/api/exchange-rates/route';
import { GET as getCityInfo } from '@/app/api/city-info/route';
import { GET as getHolidays } from '@/app/api/holidays/route';
import { getForecast, getMonthlyAverages } from '@/lib/weather';
import { convertCurrency, getExchangeRates } from '@/lib/exchange-rates';
import { getSummary } from '@/lib/wikipedia';
import { countryToCode, getHolidaysInRange, getPublicHolidays, getUpcomingHolidays } from '@/lib/holidays';

vi.mock('@/lib/weather', () => ({
  getForecast: vi.fn(),
  getMonthlyAverages: vi.fn(),
}));

vi.mock('@/lib/exchange-rates', () => ({
  getExchangeRates: vi.fn(),
  convertCurrency: vi.fn(),
}));

vi.mock('@/lib/wikipedia', () => ({
  getSummary: vi.fn(),
}));

vi.mock('@/lib/holidays', () => ({
  HolidayDateRangeError: class HolidayDateRangeError extends Error {},
  HolidayProviderUnavailableError: class HolidayProviderUnavailableError extends Error {},
  countryToCode: vi.fn(),
  getHolidaysInRange: vi.fn(),
  getPublicHolidays: vi.fn(),
  getUpcomingHolidays: vi.fn(),
}));

vi.mock('@/lib/city-coordinates', () => ({
  CITY_COORDINATES: [
    { city: 'Zero Point', lat: 0, lng: 0 },
    { city: 'Paris', lat: 48.8566, lng: 2.3522 },
  ],
}));

vi.mock('@/lib/rate-limit', () => ({
  getClientIp: vi.fn(() => '203.0.113.20'),
  rateLimit: vi.fn(() => ({
    check: vi.fn(async () => ({ success: true, reset: 0 })),
  })),
  rateLimitResponse: vi.fn((reset: number) =>
    Response.json({ error: 'Too many requests', reset }, { status: 429 })
  ),
}));

describe('public data API source contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getForecast).mockResolvedValue({
      daily: [{ date: '2026-07-10', tempMin: 12, tempMax: 20, rainChance: 0, weather: 'Clear sky', icon: 'sun', code: 0 }],
      timezone: 'UTC',
      units: 'celsius',
      lat: 0,
      lon: 0,
    });
    vi.mocked(getMonthlyAverages).mockResolvedValue({
      avgTempMin: 12,
      avgTempMax: 21,
      avgRainDays: 4,
      month: 7,
      years: '2016-2025',
    });
    vi.mocked(getExchangeRates).mockResolvedValue({
      base: 'USD',
      rates: { EUR: 0.91 },
      source: 'open.er-api.com',
      updatedAt: '2026-05-31T00:00:00.000Z',
      cached: false,
    });
    vi.mocked(convertCurrency).mockResolvedValue({
      amount: 100,
      from: 'USD',
      to: 'EUR',
      converted: 91,
      rate: 0.91,
      source: 'open.er-api.com',
    });
    vi.mocked(getSummary).mockResolvedValue({
      title: 'Paris',
      description: 'Capital city',
      extract: 'Paris is the capital of France.',
      thumbnail: null,
      originalImage: null,
      url: 'https://en.wikipedia.org/wiki/Paris',
      coordinates: null,
    });
    vi.mocked(countryToCode).mockReturnValue('FR');
    vi.mocked(getHolidaysInRange).mockResolvedValue([]);
    vi.mocked(getUpcomingHolidays).mockResolvedValue([]);
    vi.mocked(getPublicHolidays).mockResolvedValue([]);
  });

  it('keeps weather coordinates at zero valid and reports Open-Meteo source contracts', async () => {
    const response = await getWeather(new Request('http://localhost/api/weather?lat=0&lon=0&days=1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(vi.mocked(getForecast)).toHaveBeenCalledWith({ lat: 0, lon: 0, units: 'celsius', days: 1 });
    expect(body).toMatchObject({
      source: 'Open-Meteo',
      sourceStatus: 'available',
      dataPolicy: 'provider-returned-weather-only',
      daily: [{ tempMin: 12, tempMax: 20 }],
    });
  });

  it('adds source contracts to exchange-rate responses', async () => {
    const response = await getExchangeRatesRoute(new Request('http://localhost/api/exchange-rates?base=USD'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      base: 'USD',
      source: 'open.er-api.com',
      sourceStatus: 'available',
      dataPolicy: 'provider-returned-exchange-rates-only',
    });
  });

  it('adds source contracts to city-info responses', async () => {
    const response = await getCityInfo(new Request('http://localhost/api/city-info?city=Paris'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      source: 'Wikipedia',
      sourceStatus: 'available',
      dataPolicy: 'wikipedia-summary-only',
      extract: 'Paris is the capital of France.',
    });
  });

  it('adds source contracts to holiday responses', async () => {
    const response = await getHolidays(new Request(
      'http://localhost/api/holidays?country=France&checkIn=2026-07-10&checkOut=2026-07-17'
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      countryCode: 'FR',
      source: 'Nager.Date',
      sourceStatus: 'available',
      dataPolicy: 'provider-returned-public-holidays-only',
      holidays: [],
    });
  });
});
