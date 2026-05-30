import { afterEach, describe, expect, it, vi } from 'vitest';
import { haversineKm, haversineMeters } from '@/lib/utils/geo-distance';
import { detectLocation, findNearestCity, getClientIp } from '@/lib/geo';
import {
  CONTINENTS,
  findContinentForCountry,
  getCitiesByCountry,
  getContinentById,
  getCountriesByContinent,
} from '@/lib/destinations';

function requestWithHeaders(headers: Record<string, string>) {
  return {
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
  };
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn(async () => body),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('geo distance helpers', () => {
  it('computes deterministic distances even when coordinates include zero', () => {
    const meters = haversineMeters(0, 0, 0, 1);

    expect(Math.round(meters)).toBe(111195);
    expect(Math.round(haversineKm(0, 0, 0, 1))).toBe(111);
  });

  it('returns 0 for missing or non-finite coordinates', () => {
    expect(haversineMeters(null, 0, 0, 1)).toBe(0);
    expect(haversineMeters(0, Number.NaN, 0, 1)).toBe(0);
  });
});

describe('geo request helpers', () => {
  it('prefers Cloudflare IP and normalizes forwarded client IPs', () => {
    expect(getClientIp(requestWithHeaders({ 'cf-connecting-ip': '2001:db8::1' }))).toBe('2001:db8::1');
    expect(getClientIp(requestWithHeaders({ 'x-forwarded-for': '203.0.113.10:443, 198.51.100.20' }))).toBe('203.0.113.10');
    expect(getClientIp(requestWithHeaders({ 'x-forwarded-for': '[2001:db8::2]:443' }))).toBe('2001:db8::2');
  });

  it('prefers the first forwarded client IP', () => {
    const request = requestWithHeaders({ 'x-forwarded-for': '203.0.113.10, 198.51.100.20' });

    expect(getClientIp(request)).toBe('203.0.113.10');
  });

  it('falls back to x-real-ip and null when headers are absent or invalid', () => {
    expect(getClientIp(requestWithHeaders({ 'x-real-ip': '198.51.100.8' }))).toBe('198.51.100.8');
    expect(getClientIp(requestWithHeaders({ 'x-forwarded-for': 'unknown', 'x-real-ip': '198.51.100.9' }))).toBe('198.51.100.9');
    expect(getClientIp(requestWithHeaders({ 'x-forwarded-for': 'not an ip' }))).toBeNull();
    expect(getClientIp(requestWithHeaders({}))).toBeNull();
  });

  it('finds the nearest city and keeps valid zero coordinates', () => {
    const nearest = findNearestCity(51.5, 0.1, [
      { city: 'Greenwich', lat: 51.4769, lon: 0 },
      { city: 'Paris', lat: 48.8566, lon: 2.3522 },
      { city: 'Invalid', lat: Number.NaN, lon: 0 },
    ]);

    expect(nearest).toEqual({ city: 'Greenwich', distance: 7 });
  });

  it('returns null when no usable city coordinates exist', () => {
    expect(findNearestCity(0, 0, [])).toBeNull();
    expect(findNearestCity(0, 0, [{ city: 'Missing', lat: Number.NaN, lon: 0 }])).toBeNull();
  });
});

describe('geo provider detection', () => {
  it('normalizes primary provider responses and uses provider currency when available', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      status: 'success',
      country: 'France',
      countryCode: 'FR',
      city: 'Paris',
      lat: 48.8566,
      lon: 2.3522,
      currency: 'EUR',
      timezone: 'Europe/Paris',
      isp: 'Example Transit',
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(detectLocation('203.0.113.10:443')).resolves.toMatchObject({
      country: 'France',
      countryCode: 'FR',
      city: 'Paris',
      currency: 'EUR',
      source: 'ip-api',
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/203.0.113.10?fields=');
  });

  it('falls back to ipapi and derives currency only from verified country code', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ status: 'fail' }))
      .mockResolvedValueOnce(jsonResponse({
        country_name: 'Israel',
        country_code: 'IL',
        city: 'Tel Aviv',
        latitude: 32.0853,
        longitude: 34.7818,
        timezone: 'Asia/Jerusalem',
      }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(detectLocation('198.51.100.8')).resolves.toMatchObject({
      country: 'Israel',
      countryCode: 'IL',
      city: 'Tel Aviv',
      currency: 'ILS',
      source: 'ipapi',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not send invalid IP values to external geolocation providers', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(detectLocation('not an ip')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('destination catalog helpers', () => {
  it('resolves continents, countries, and city lists from the static destination catalog', () => {
    expect(CONTINENTS.length).toBeGreaterThanOrEqual(6);
    expect(getContinentById('europe')?.name).toBe('Europe');
    expect(getCountriesByContinent('middle-east').map((country) => country.code)).toContain('IL');
    expect(getCitiesByCountry('FR')).toContain('Paris');
    expect(findContinentForCountry('france')?.id).toBe('europe');
  });

  it('returns empty or undefined values for unknown destination inputs', () => {
    expect(getContinentById('unknown')).toBeUndefined();
    expect(getCountriesByContinent('unknown')).toEqual([]);
    expect(getCitiesByCountry('ZZ')).toEqual([]);
    expect(findContinentForCountry('Atlantis')).toBeUndefined();
  });
});
