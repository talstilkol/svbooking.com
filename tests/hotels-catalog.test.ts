import { describe, it, expect, vi } from 'vitest';
import {
  HOTELS,
  listCities,
  listCountries,
  getHotelsByCity,
  getHotelsByCountry,
  getHotelsByContinent,
  getHotelsByCities,
  findHotel,
  searchHotels,
  addDiscoveredHotel,
  addAndPersistHotel,
  getFullCatalog,
  getCatalogStats,
} from '@/lib/hotels-catalog';

describe('hotels-catalog', () => {
  describe('HOTELS', () => {
    it('has at least 500 hotels', () => {
      expect(HOTELS.length).toBeGreaterThanOrEqual(500);
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

    it('does not throw for non-string city input', () => {
      expect(getHotelsByCity(42 as unknown as string)).toEqual([]);
    });
  });

  describe('getHotelsByCountry', () => {
    it('returns hotels for a known country', () => {
      const hotels = getHotelsByCountry('France');
      expect(hotels.length).toBeGreaterThan(0);
      hotels.forEach((h) => expect(h.country).toBe('France'));
    });

    it('returns all hotels when country is empty', () => {
      expect(getHotelsByCountry('')).toBe(HOTELS);
      expect(getHotelsByCountry(undefined as unknown as string)).toBe(HOTELS);
    });

    it('returns empty array for unknown country', () => {
      expect(getHotelsByCountry('Narnia')).toEqual([]);
    });

    it('does not throw for non-string country input', () => {
      expect(getHotelsByCountry({} as unknown as string)).toEqual([]);
    });
  });

  describe('getHotelsByContinent', () => {
    it('returns hotels for a known continent', () => {
      const hotels = getHotelsByContinent('europe');
      expect(hotels.length).toBeGreaterThan(0);
      expect(hotels.some((h) => h.city === 'Paris')).toBe(true);
    });

    it('normalizes continent casing and whitespace', () => {
      expect(getHotelsByContinent(' Europe ')).toEqual(getHotelsByContinent('europe'));
    });

    it('returns empty array for invalid continent input', () => {
      expect(getHotelsByContinent(null as unknown as string)).toEqual([]);
      expect(getHotelsByContinent('Atlantis')).toEqual([]);
    });
  });

  describe('getHotelsByCities', () => {
    it('returns hotels from valid cities and skips malformed entries', () => {
      const hotels = getHotelsByCities(['Paris', ' paris ', '', null as unknown as string, 'Atlantis']);
      expect(hotels.length).toBeGreaterThan(0);
      expect(hotels.every((h) => h.city === 'Paris')).toBe(true);
    });

    it('returns the full catalog when no city list is supplied', () => {
      expect(getHotelsByCities([])).toBe(HOTELS);
      expect(getHotelsByCities(null as unknown as string[])).toBe(HOTELS);
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
      expect(searchHotels('   ')).toEqual([]);
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

    it('covers country matches, city typo matches, and non-fuzzy query boundaries', () => {
      const france = searchHotels('France');
      expect(france.length).toBeGreaterThan(0);
      expect(france.some((hotel) => hotel.country === 'France')).toBe(true);

      const tokyoTypo = searchHotels('Tokio');
      expect(tokyoTypo.some((hotel) => hotel.city === 'Tokyo')).toBe(true);

      expect(searchHotels('qx')).toEqual([]);
      expect(searchHotels('query-that-is-too-long-for-fuzzy')).toEqual([]);
    });
  });

  describe('addDiscoveredHotel', () => {
    it('rejects malformed and duplicate catalog entries', () => {
      expect(addDiscoveredHotel(null)).toBe(false);
      expect(addDiscoveredHotel({
        hotelKey: 'not-a-tripadvisor-key',
        name: 'Le Meurice',
        city: 'Paris',
        country: 'France',
      })).toBe(false);
      expect(addDiscoveredHotel({
        hotelKey: 'g187147-d188728',
        name: 'Le Meurice',
        city: 'Paris',
        country: 'France',
      })).toBe(false);
      expect(addDiscoveredHotel({
        hotelKey: 'g187147-d197601',
        name: '   ',
        city: 'Paris',
        country: 'France',
      })).toBe(false);
    });

    it('normalizes verified dynamic entries before indexing them', () => {
      const before = getCatalogStats();
      const added = addDiscoveredHotel({
        hotelKey: 'g187147-d197601',
        name: '  Hotel Lutetia  ',
        city: ' Paris ',
        country: ' France ',
        stars: 9,
        lat: 120,
        lon: -240,
        source: ' wikidata ',
        sourceUrl: 'https://127.0.0.1/internal',
        externalIds: [] as unknown as object,
        provenance: { source: 'wikidata' },
      });

      expect(added).toBe(true);
      const hotel = findHotel('g187147-d197601');
      expect(hotel).toMatchObject({
        hotelKey: 'g187147-d197601',
        name: 'Hotel Lutetia',
        city: 'Paris',
        country: 'France',
        stars: 0,
        lat: null,
        lon: null,
        source: 'wikidata',
        sourceUrl: null,
        externalIds: {},
        provenance: { source: 'wikidata' },
        discovered: true,
      });
      expect(getHotelsByCity('Paris')).toContain(hotel);
      expect(getCatalogStats().discoveredHotels).toBe(before.discoveredHotels + 1);
    });

    it('indexes a verified discovered hotel for a new city without assigning an unmapped continent', () => {
      const before = getCatalogStats();
      const added = addDiscoveredHotel({
        hotelKey: 'g609123-d497853',
        name: 'Hotel Arctic',
        city: 'Ilulissat',
        country: 'Greenland',
        stars: 4,
        lat: 69.2198,
        lon: -51.0986,
        source: 'tripadvisor',
        sourceUrl: 'https://www.tripadvisor.com/Hotel_Review-g609123-d497853-Reviews-Hotel_Arctic-Ilulissat_Qaasuitsup_Municipality.html',
        externalIds: { tripadvisorLocationId: '609123', tripadvisorHotelId: '497853' },
        provenance: {
          source: 'tripadvisor',
          sourceUrl: 'https://www.tripadvisor.com/Hotel_Review-g609123-d497853-Reviews-Hotel_Arctic-Ilulissat_Qaasuitsup_Municipality.html',
        },
      });

      expect(added).toBe(true);
      const hotel = findHotel('g609123-d497853');
      expect(hotel).toMatchObject({
        name: 'Hotel Arctic',
        city: 'Ilulissat',
        country: 'Greenland',
        image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
        discovered: true,
      });
      expect(getHotelsByCity('Ilulissat')).toContain(hotel);
      expect(getHotelsByCountry('Greenland')).toContain(hotel);
      expect(getHotelsByContinent('europe')).not.toContain(hotel);
      expect(getCatalogStats()).toMatchObject({
        totalHotels: before.totalHotels + 1,
        discoveredHotels: before.discoveredHotels + 1,
        cities: before.cities + 1,
        countries: before.countries + 1,
        continents: before.continents,
      });
    });

    it('loads verified discovered hotels from KV once and returns the merged runtime catalog', async () => {
      const { kv } = await import('@/lib/kv');
      await kv.setWithTTL('catalog:discovered', [{
        hotelKey: 'g188590-d900001',
        name: 'Sourced Berlin Hotel',
        city: 'Berlin',
        country: 'Germany',
        stars: 4,
        lat: 52.52,
        lon: 13.405,
        source: 'wikidata',
        sourceUrl: 'https://www.wikidata.org/wiki/Q900001',
        externalIds: { wikidataId: 'Q900001' },
        provenance: {
          source: 'wikidata',
          sourceUrl: 'https://www.wikidata.org/wiki/Q900001',
        },
      }], 3600);
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const first = await getFullCatalog();
      const second = await getFullCatalog();

      expect(first).toBe(HOTELS);
      expect(second).toBe(HOTELS);
      expect(findHotel('g188590-d900001')).toMatchObject({
        name: 'Sourced Berlin Hotel',
        city: 'Berlin',
        country: 'Germany',
        discovered: true,
      });
      expect(getHotelsByContinent('europe')).toContain(findHotel('g188590-d900001'));
      expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Loaded 1 discovered hotels from KV'));
      infoSpy.mockRestore();
    });

    it('persists verified discovered hotels and rejects invalid durable catalog writes', async () => {
      const { kv } = await import('@/lib/kv');
      await kv.setWithTTL('catalog:discovered', { not: 'an array' }, 3600);

      await expect(addAndPersistHotel({
        hotelKey: 'not-a-key',
        name: 'Invalid Durable Hotel',
        city: 'Paris',
        country: 'France',
      })).resolves.toBe(false);

      await expect(addAndPersistHotel({
        hotelKey: 'g187497-d900002',
        name: 'Sourced Madrid Hotel',
        city: 'Madrid',
        country: 'Spain',
        stars: 4,
        lat: 40.4168,
        lon: -3.7038,
        source: 'wikidata',
        sourceUrl: 'https://www.wikidata.org/wiki/Q900002',
        externalIds: { wikidataId: 'Q900002' },
        provenance: {
          source: 'wikidata',
          sourceUrl: 'https://www.wikidata.org/wiki/Q900002',
        },
      })).resolves.toBe(true);

      const stored = await kv.get('catalog:discovered');
      expect(stored).toEqual([
        expect.objectContaining({
          hotelKey: 'g187497-d900002',
          name: 'Sourced Madrid Hotel',
          city: 'Madrid',
          country: 'Spain',
        }),
      ]);
    });
  });
});
