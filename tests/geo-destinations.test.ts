import { describe, expect, it } from 'vitest';
import { haversineKm, haversineMeters } from '@/lib/utils/geo-distance';
import { findNearestCity, getClientIp } from '@/lib/geo';
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
  it('prefers the first forwarded client IP', () => {
    const request = requestWithHeaders({ 'x-forwarded-for': '203.0.113.10, 198.51.100.20' });

    expect(getClientIp(request)).toBe('203.0.113.10');
  });

  it('falls back to x-real-ip and null when headers are absent', () => {
    expect(getClientIp(requestWithHeaders({ 'x-real-ip': '198.51.100.8' }))).toBe('198.51.100.8');
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
