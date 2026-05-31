import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/destination-intel/route';
import { getForecast } from '@/lib/weather';
import { getSummary } from '@/lib/wikipedia';
import { countryToCode, getHolidaysInRange, getUpcomingHolidays } from '@/lib/holidays';
import { getCurrencySymbol, getExchangeRates } from '@/lib/exchange-rates';
import { getHotelsByCity } from '@/lib/hotels-catalog';
import { fetchJsonWithTimeout } from '@/lib/utils/fetch-with-timeout';

vi.mock('@/lib/weather', () => ({
  getForecast: vi.fn(),
}));

vi.mock('@/lib/wikipedia', () => ({
  getSummary: vi.fn(),
}));

vi.mock('@/lib/holidays', () => ({
  countryToCode: vi.fn(),
  getHolidaysInRange: vi.fn(),
  getUpcomingHolidays: vi.fn(),
}));

vi.mock('@/lib/exchange-rates', () => ({
  getExchangeRates: vi.fn(),
  getCurrencySymbol: vi.fn((code: string) => code),
}));

vi.mock('@/lib/city-coordinates', () => ({
  CITY_COORDINATES: [
    { city: 'Paris', lat: 48.8566, lng: 2.3522 },
    { city: 'Zero Point', lat: 0, lng: 0 },
  ],
}));

vi.mock('@/lib/hotels-catalog', () => ({
  getHotelsByCity: vi.fn(),
}));

vi.mock('@/lib/utils/fetch-with-timeout', () => ({
  fetchJsonWithTimeout: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  getClientIp: vi.fn(() => '203.0.113.10'),
  rateLimit: vi.fn(() => ({
    check: vi.fn(async () => ({ success: true, reset: 0 })),
  })),
  rateLimitResponse: vi.fn((reset: number) =>
    Response.json({ error: 'Too many requests', reset }, { status: 429 })
  ),
}));

describe('destination intelligence API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSummary).mockResolvedValue(null);
    vi.mocked(getForecast).mockResolvedValue({
      daily: [
        {
          date: '2026-07-10',
          tempMin: 12,
          tempMax: 20,
          rainChance: 5,
          weather: 'Clear sky',
          icon: 'sun',
          code: 0,
        },
      ],
      timezone: 'Europe/Paris',
      units: 'celsius',
      lat: 48.8566,
      lon: 2.3522,
    });
    vi.mocked(countryToCode).mockReturnValue('FR');
    vi.mocked(getHolidaysInRange).mockResolvedValue([]);
    vi.mocked(getUpcomingHolidays).mockResolvedValue([]);
    vi.mocked(getExchangeRates).mockResolvedValue(null);
    vi.mocked(getCurrencySymbol).mockImplementation((code: string) => code);
    vi.mocked(fetchJsonWithTimeout).mockRejectedValue(new Error('daylight unavailable'));
    vi.mocked(getHotelsByCity).mockReturnValue([{ hotelKey: 'g1-d2', name: 'Le Meurice' }]);
  });

  it('reports only sources that were actually available for the response', async () => {
    const response = await GET(new Request(
      'http://localhost/api/destination-intel?city=Paris&country=France&checkIn=2026-07-10&checkOut=2026-07-17'
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dataPolicy).toBe('available-source-data-only');
    expect(body.sources).toEqual(['Open-Meteo', 'Nager.Date', 'SV Booking catalog']);
    expect(body.sourceStates).toMatchObject({
      wikipedia: 'unavailable',
      weather: 'available',
      holidays: 'available',
      exchangeRates: 'unavailable',
      daylight: 'unavailable',
      catalog: 'available',
    });
    expect(body.weather[0]).toMatchObject({ tempMin: 12, tempMax: 20 });
    expect(body.sources).not.toContain('Wikipedia');
    expect(body.sources).not.toContain('Open Exchange Rates');
    expect(body.sources).not.toContain('Sunrise-Sunset');
  });

  it('treats zero coordinates as valid instead of dropping weather evidence', async () => {
    vi.mocked(getHotelsByCity).mockReturnValue([]);

    const response = await GET(new Request('http://localhost/api/destination-intel?city=Zero%20Point'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(vi.mocked(getForecast)).toHaveBeenCalledWith({ lat: 0, lon: 0, days: 7 });
    expect(body.coordinates).toEqual({ lat: 0, lon: 0 });
    expect(body.sourceStates.catalog).toBe('empty');
    expect(body.sources).toEqual(['Open-Meteo']);
  });
});
