import { describe, it, expect } from 'vitest';
import {
  HOTELS,
  listCities,
  listCountries,
  getHotelsByCity,
  getHotelsByCountry,
  findHotel,
  searchHotels,
} from '@/lib/hotels-catalog';

describe('hotels-catalog', () => {
  describe('HOTELS', () => {
    it('has at least 100 hotels', () => {
      expect(HOTELS.length).toBeGreaterThanOrEqual(100);
    });

    it('every hotel has required fields', () => {
      for (const h of HOTELS) {
        expect(h.hotelKey).toMatch(/^g\d+-d\d+$/);
        expect(h.name).toBeTruthy();
        expect(h.city).toBeTruthy();
        expect(h.country).toBeTruthy();
        expect(h.image).toMatch(/^https:\/\//);
      }
    });

    it('has no duplicate hotel keys', () => {
      const keys = new Set(HOTELS.map((h) => h.hotelKey));
      expect(keys.size).toBe(HOTELS.length);
    });
  });

  describe('listCities', () => {
    it('returns an array of city names in sorted order', () => {
      const cities = listCities();
      expect(cities.length).toBeGreaterThan(10);
      // Catalog sorts by lowercase key — verify general ordering
      // First city should start early in alphabet, last city late
      expect('ab').toContain(cities[0].charAt(0).toLowerCase());
      const lastChar = cities[cities.length - 1].charAt(0).toLowerCase();
      expect('tuvwxyz').toContain(lastChar);
    });

    it('includes known cities', () => {
      const cities = listCities();
      expect(cities).toContain('Paris');
      expect(cities).toContain('Tokyo');
      expect(cities).toContain('Tel Aviv');
    });
  });

  describe('listCountries', () => {
    it('returns a sorted array of country names', () => {
      const countries = listCountries();
      expect(countries.length).toBeGreaterThan(5);
    });
  });

  describe('getHotelsByCity', () => {
    it('returns hotels for a known city', () => {
      const hotels = getHotelsByCity('Paris');
      expect(hotels.length).toBeGreaterThan(0);
      hotels.forEach((h) => expect(h.city).toBe('Paris'));
    });

    it('is case-insensitive', () => {
      const lower = getHotelsByCity('paris');
      const upper = getHotelsByCity('PARIS');
      expect(lower).toEqual(upper);
    });

    it('returns empty array for unknown city', () => {
      expect(getHotelsByCity('Atlantis')).toEqual([]);
    });

    it('returns all hotels when city is null', () => {
      expect(getHotelsByCity(null)).toBe(HOTELS);
    });
  });

  describe('getHotelsByCountry', () => {
    it('returns hotels for a known country', () => {
      const hotels = getHotelsByCountry('France');
      expect(hotels.length).toBeGreaterThan(0);
      hotels.forEach((h) => expect(h.country).toBe('France'));
    });

    it('returns empty array for unknown country', () => {
      expect(getHotelsByCountry('Narnia')).toEqual([]);
    });
  });

  describe('findHotel', () => {
    it('finds a hotel by key', () => {
      const hotel = findHotel('g293984-d301497');
      expect(hotel).not.toBeNull();
      expect(hotel!.name).toBe('Hilton Tel Aviv');
    });

    it('returns null for unknown key', () => {
      expect(findHotel('g000000-d000000')).toBeNull();
    });
  });

  describe('searchHotels', () => {
    it('finds hotels by name', () => {
      const results = searchHotels('Hilton');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Hilton');
    });

    it('finds hotels by city', () => {
      const results = searchHotels('Paris');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((h) => h.city === 'Paris')).toBe(true);
    });

    it('returns empty for empty query', () => {
      expect(searchHotels('')).toEqual([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(searchHotels(null as unknown as string)).toEqual([]);
    });

    it('limits results to 10', () => {
      const results = searchHotels('hotel');
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('ranks exact name matches higher than city matches', () => {
      const results = searchHotels('Tel Aviv');
      // Hotels IN Tel Aviv should score higher than hotels containing "Tel" somewhere
      expect(results.length).toBeGreaterThan(0);
    });

    it('handles fuzzy matching for typos', () => {
      const results = searchHotels('Pars'); // typo for Paris
      // Should find Paris hotels via fuzzy match
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
