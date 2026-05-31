import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Service Unavailable',
    json: vi.fn(async () => body),
  };
}

describe('Overpass POI helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('discovers attractions and preserves zero coordinates from OSM elements', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      elements: [
        { id: 1, lat: 0, lon: 0, tags: { name: 'Louvre Museum', tourism: 'museum', wikidata: 'Q19675' } },
        { id: 2, center: { lat: 48.8584, lon: 2.2945 }, tags: { name: 'Eiffel Tower', tourism: 'attraction' } },
        { id: 3, lat: 0, lon: 0, tags: { name: 'Louvre Museum', tourism: 'museum' } },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { discoverAttractions } = await import('@/lib/overpass-pois');

    const attractions = await discoverAttractions({ lat: 0, lon: 0, limit: 5 });

    expect(attractions[0]).toMatchObject({
      name: 'Louvre Museum',
      type: 'Museum',
      distanceM: 0,
      lat: 0,
      lon: 0,
    });
    expect(attractions).toHaveLength(2);
  });

  it('maps attraction fallback types and kilometer distances from OSM tags', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      elements: [
        { id: 1, lat: 0.02, lon: 0, tags: { 'name:en': 'Old Quarter', historic: 'district' } },
        { id: 2, lat: 0.01, lon: 0, tags: { name: 'Canal Walk', leisure: 'promenade', website: 'https://www.paris.fr/' } },
        { id: 3, lat: 0.03, lon: 0, tags: { name: 'River Aquarium', tourism: 'aquarium' } },
        { id: 4, lat: 0.04, lon: 0, tags: { name: 'Unclassified Landmark' } },
        { id: 5, lat: 0.05, lon: 0, tags: { tourism: 'viewpoint' } },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { discoverAttractions } = await import('@/lib/overpass-pois');

    const attractions = await discoverAttractions({ lat: 0, lon: 0, limit: 10 });

    expect(attractions).toEqual([
      expect.objectContaining({ name: 'Canal Walk', type: 'Promenade', icon: '🌳', distance: '1.1 km' }),
      expect.objectContaining({ name: 'Old Quarter', type: 'Historic', icon: '🏛️', distance: '2.2 km' }),
      expect.objectContaining({ name: 'River Aquarium', type: 'Aquarium', icon: '📍', distance: '3.3 km' }),
      expect.objectContaining({ name: 'Unclassified Landmark', type: 'Place', icon: '📍', distance: '4.4 km' }),
    ]);
    expect(attractions[0].website).toBe('https://www.paris.fr/');
  });

  it('discovers restaurants and maps cuisine labels deterministically', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      elements: [
        { id: 1, lat: 48.857, lon: 2.35, tags: { name: 'Epicure', cuisine: 'french', phone: '+33123456789' } },
        { id: 2, center: { lat: 48.856, lon: 2.34 }, tags: { name: 'Sushi B', cuisine: 'japanese;sushi' } },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { discoverRestaurants } = await import('@/lib/overpass-pois');

    const restaurants = await discoverRestaurants({ lat: 48.8566, lon: 2.3522, limit: 2 });

    expect(restaurants.map((restaurant) => restaurant.cuisine)).toEqual(['French', 'Japanese']);
    expect(restaurants[0]).toMatchObject({ name: 'Epicure', phone: '+33123456789' });
  });

  it('keeps restaurant metadata when cuisine tags are missing', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      elements: [
        {
          id: 1,
          lat: 0,
          lon: 0.01,
          tags: {
            'name:en': 'Riverside Kitchen',
            'contact:phone': '+33111111111',
            opening_hours: 'Mo-Fr 09:00-18:00',
            stars: '4',
            website: 'https://www.oetkercollection.com/hotels/le-bristol-paris/restaurants-bar/epicure/',
          },
        },
        {
          id: 2,
          lat: 0,
          lon: 0.02,
          tags: { name: 'Riverside Kitchen', cuisine: 'thai' },
        },
        {
          id: 3,
          lat: 0,
          lon: 0.03,
          tags: {},
        },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { discoverRestaurants } = await import('@/lib/overpass-pois');

    const restaurants = await discoverRestaurants({ lat: 0, lon: 0, limit: 10 });

    expect(restaurants).toEqual([
      expect.objectContaining({
        name: 'Riverside Kitchen',
        cuisine: 'Restaurant',
        icon: '🍽️',
        phone: '+33111111111',
        openingHours: 'Mo-Fr 09:00-18:00',
        stars: 4,
        website: 'https://www.oetkercollection.com/hotels/le-bristol-paris/restaurants-bar/epicure/',
      }),
    ]);
  });

  it('returns empty POI lists for empty or nameless Overpass payloads', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ elements: [] }))
      .mockResolvedValueOnce(jsonResponse({ elements: [{ id: 1 }] }))
      .mockResolvedValueOnce(jsonResponse({ elements: [] }))
      .mockResolvedValueOnce(jsonResponse({ elements: [{ id: 2 }] }));
    vi.stubGlobal('fetch', fetchMock);
    const { discoverAttractions, discoverRestaurants } = await import('@/lib/overpass-pois');

    await expect(discoverAttractions({ lat: 0, lon: 0 })).resolves.toEqual([]);
    await expect(discoverRestaurants({ lat: 0, lon: 0 })).resolves.toEqual([]);
    await expect(discoverRestaurants({ lat: 0, lon: 0 })).resolves.toEqual([]);
    await expect(discoverAttractions({ lat: 0, lon: 0 })).resolves.toEqual([]);
  });

  it('surfaces Overpass rate limits, HTTP errors, and request timeouts for discovery calls', async () => {
    vi.stubGlobal('fetch', vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 429))
      .mockResolvedValueOnce(jsonResponse({}, false, 503)));
    const { discoverAttractions, discoverRestaurants } = await import('@/lib/overpass-pois');

    await expect(discoverAttractions({ lat: 0, lon: 0 })).rejects.toThrow('Overpass rate limited');
    await expect(discoverRestaurants({ lat: 0, lon: 0 })).rejects.toThrow('Overpass HTTP 503');

    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_input: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));

    const request = discoverAttractions({ lat: 0, lon: 0, timeoutMs: 20 });
    const assertion = expect(request).rejects.toThrow('Overpass timeout');

    await vi.advanceTimersByTimeAsync(20);
    await assertion;
  });

  it('returns hotel amenities for valid zero coordinates and sanitizes hotel-name query text', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      elements: [
        {
          tags: {
            internet_access: 'wlan',
            'internet_access:fee': 'no',
            parking: 'yes',
            wheelchair: 'limited',
            stars: '5',
          },
        },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { getHotelAmenities } = await import('@/lib/overpass-pois');

    const result = await getHotelAmenities({ lat: 0, lon: 0, hotelName: 'Le "Meurice" [Paris]' });
    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]));
    const query = requestedUrl.searchParams.get('data') || '';

    expect(query).not.toContain('"Meurice"');
    expect(result).toEqual({
      amenities: [
        { icon: '🅿️', label: 'Parking' },
        { icon: '♿', label: 'Accessible' },
        { icon: '📶', label: 'Free WiFi' },
      ],
      stars: 5,
    });
  });

  it('returns null when OSM hotel tags do not expose known amenities', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        elements: [
          { tags: { tourism: 'hotel', stars: '3' } },
        ],
      }))
      .mockResolvedValueOnce(jsonResponse({ elements: [{}] }));
    vi.stubGlobal('fetch', fetchMock);
    const { getHotelAmenities } = await import('@/lib/overpass-pois');

    await expect(getHotelAmenities({ lat: 48.8566, lon: 2.3522, hotelName: 'A' })).resolves.toBeNull();
    await expect(getHotelAmenities({ lat: 48.8566, lon: 2.3522, hotelName: 'City Hotel' })).resolves.toBeNull();
    await expect(getHotelAmenities({ lat: 48.8566, lon: 2.3522, hotelName: 'River Hotel' })).resolves.toBeNull();
  });

  it('handles empty hotel amenity matches and free internet without a duplicate WiFi tag', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ elements: [] }))
      .mockResolvedValueOnce(jsonResponse({
        elements: [{ tags: { internet_access: 'yes', 'internet_access:fee': 'no' } }],
      }));
    vi.stubGlobal('fetch', fetchMock);
    const { getHotelAmenities } = await import('@/lib/overpass-pois');

    await expect(getHotelAmenities({ lat: 48.8566, lon: 2.3522, hotelName: 'City Hotel' })).resolves.toBeNull();
    await expect(getHotelAmenities({ lat: 48.8566, lon: 2.3522, hotelName: 'River Hotel' })).resolves.toEqual({
      amenities: [{ icon: '📶', label: 'Free WiFi' }],
      stars: null,
    });
  });

  it('returns null when hotel amenity inputs are unusable or Overpass fails', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, false, 503));
    vi.stubGlobal('fetch', fetchMock);
    const { getHotelAmenities } = await import('@/lib/overpass-pois');

    await expect(getHotelAmenities({ lat: Number.NaN, lon: 0, hotelName: 'Le Meurice' })).resolves.toBeNull();
    await expect(getHotelAmenities({ lat: 48.8566, lon: 2.3522, hotelName: 'Le Meurice' })).resolves.toBeNull();
  });
});

describe('weather helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('maps Open-Meteo forecast data into compact daily weather records', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      timezone: 'Europe/Paris',
      daily: {
        time: ['2026-06-01', '2026-06-02'],
        weathercode: [0, 63],
        temperature_2m_min: [14, 15],
        temperature_2m_max: [24, 22],
        precipitation_probability_max: [10, 80],
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { getForecast } = await import('@/lib/weather');

    const forecast = await getForecast({ lat: 48.8566, lon: 2.3522, units: 'fahrenheit', days: 20 });
    const url = new URL(String(fetchMock.mock.calls[0][0]));

    expect(url.searchParams.get('forecast_days')).toBe('16');
    expect(url.searchParams.get('temperature_unit')).toBe('fahrenheit');
    expect(forecast).toMatchObject({
      timezone: 'Europe/Paris',
      units: 'fahrenheit',
      daily: [
        { date: '2026-06-01', weather: 'Clear sky', tempMin: 14, tempMax: 24, rainChance: 10 },
        { date: '2026-06-02', weather: 'Rain', tempMin: 15, tempMax: 22, rainChance: 80 },
      ],
    });
  });

  it('computes historical monthly averages from non-null daily observations', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      daily: {
        time: ['2016-06-01', '2016-06-02', '2016-06-03'],
        temperature_2m_min: [10, null, 14],
        temperature_2m_max: [20, 22, null],
        precipitation_sum: [0, 2, 3],
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { getMonthlyAverages } = await import('@/lib/weather');

    await expect(getMonthlyAverages({ lat: 48.8566, lon: 2.3522, month: 6 })).resolves.toEqual({
      avgTempMin: 12,
      avgTempMax: 21,
      avgRainDays: 20,
      month: 6,
      years: '2016-2025',
    });
  });

  it('throws explicit errors for missing weather data and HTTP failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, true)));
    const { getForecast, getMonthlyAverages } = await import('@/lib/weather');

    await expect(getForecast({ lat: 0, lon: 0 })).rejects.toThrow('No forecast data returned');
    await expect(getMonthlyAverages({ lat: 0, lon: 0, month: 1 })).rejects.toThrow('No historical data returned');

    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, false, 500)));
    await expect(getForecast({ lat: 0, lon: 0 })).rejects.toThrow('HTTP 500');
  });

  it('uses explicit unknown weather labels and null historical averages when source arrays are empty', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        timezone: 'UTC',
        daily: {
          time: ['2026-06-01'],
          weathercode: [777],
          temperature_2m_min: [null],
          temperature_2m_max: [null],
          precipitation_probability_max: [null],
        },
      }))
      .mockResolvedValueOnce(jsonResponse({
        daily: {
          time: ['2016-01-01'],
          temperature_2m_min: [null],
          temperature_2m_max: [null],
          precipitation_sum: [null],
        },
      }));
    vi.stubGlobal('fetch', fetchMock);
    const { getForecast, getMonthlyAverages } = await import('@/lib/weather');

    await expect(getForecast({ lat: 0, lon: 0, units: 'kelvin' })).resolves.toMatchObject({
      units: 'celsius',
      daily: [{ weather: 'Unknown', icon: '❓', code: 777 }],
    });
    await expect(getMonthlyAverages({ lat: 0, lon: 0, month: 1 })).resolves.toEqual({
      avgTempMin: null,
      avgTempMax: null,
      avgRainDays: null,
      month: 1,
      years: '2016-2025',
    });
  });

  it('surfaces weather timeouts with the configured timeout budget', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_input: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));
    const { getForecast } = await import('@/lib/weather');

    const request = getForecast({ lat: 0, lon: 0, timeoutMs: 30 });
    const assertion = expect(request).rejects.toThrow('Weather request timed out after 30ms');

    await vi.advanceTimersByTimeAsync(30);
    await assertion;
  });
});

describe('Nominatim hotel search helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('searches and normalizes hotel results from Nominatim', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([
      {
        class: 'tourism',
        type: 'hotel',
        name: 'Le Meurice',
        lat: '48.8655',
        lon: '2.3283',
        extratags: { stars: '5', rooms: '160', wikidata: 'Q1815101', brand: 'Dorchester Collection' },
        address: { city: 'Paris', country: 'France', country_code: 'fr' },
        display_name: 'Le Meurice, Paris, France',
        osm_id: 123,
        osm_type: 'way',
      },
      { class: 'amenity', type: 'restaurant', name: 'Not a hotel' },
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const { searchHotels } = await import('@/lib/nominatim');

    const hotels = await searchHotels({ city: 'Paris', limit: 100 });
    const url = new URL(String(fetchMock.mock.calls[0][0]));

    expect(url.searchParams.get('limit')).toBe('40');
    expect(hotels).toEqual([
      expect.objectContaining({
        name: 'Le Meurice',
        lat: 48.8655,
        lon: 2.3283,
        city: 'Paris',
        country: 'France',
        countryCode: 'fr',
        stars: 5,
        rooms: 160,
        wikidataId: 'Q1815101',
      }),
    ]);
  });

  it('looks up a hotel, reverse geocodes coordinates, and rejects missing inputs', async () => {
    const hotelResult = {
      class: 'tourism',
      type: 'hotel',
      name: 'Le Meurice',
      lat: '48.8655',
      lon: '2.3283',
      extratags: {},
      address: { city: 'Paris', country: 'France' },
      display_name: 'Le Meurice, Paris, France',
    };
    const fetchMock = vi.fn(async () => jsonResponse([hotelResult]));
    vi.stubGlobal('fetch', fetchMock);
    const { lookupHotel, reverseGeocode, searchHotels } = await import('@/lib/nominatim');

    await expect(searchHotels({ city: '' })).rejects.toThrow('City name is required');
    await expect(lookupHotel({ name: '' })).rejects.toThrow('Hotel name is required');
    await expect(lookupHotel({ name: 'Le Meurice', city: 'Paris' })).resolves.toMatchObject({ name: 'Le Meurice' });

    fetchMock.mockResolvedValueOnce(jsonResponse(hotelResult));
    await expect(reverseGeocode({ lat: 48.8655, lon: 2.3283 })).resolves.toMatchObject({ name: 'Le Meurice' });
  });

  it('returns null for empty Nominatim hotel matches and preserves address fallbacks', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([{ class: 'tourism', type: 'guest_house', name: 'Not Hotel' }]))
      .mockResolvedValueOnce(jsonResponse({
        class: 'tourism',
        type: 'hotel',
        display_name: 'District Hotel, Paris, France',
        lat: '0',
        lon: '0',
        extratags: { website: 'https://district.example.invalid', 'brand:wikidata': 'Q123' },
        address: { city_district: 'Central District', country: 'France' },
        osm_id: 456,
        osm_type: 'node',
      }));
    vi.stubGlobal('fetch', fetchMock);
    const { lookupHotel, reverseGeocode } = await import('@/lib/nominatim');

    await expect(lookupHotel({ name: 'Missing Hotel' })).resolves.toBeNull();
    await expect(reverseGeocode({ lat: 0, lon: 0 })).resolves.toMatchObject({
      name: 'District Hotel',
      lat: 0,
      lon: 0,
      city: 'Central District',
      country: 'France',
      brandWikidataId: 'Q123',
      website: 'https://district.example.invalid',
    });
  });

  it('uses Nominatim lookup fallbacks without fabricating missing names or reverse data', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([{
        class: 'tourism',
        type: 'hotel',
        name: 'Town Hotel',
        lat: '51.5',
        lon: '-0.1',
        extratags: {},
        address: { town: 'Small Town', country: 'United Kingdom' },
        display_name: 'Town Hotel, Small Town, United Kingdom',
      }]))
      .mockResolvedValueOnce(jsonResponse(null))
      .mockResolvedValueOnce(jsonResponse([{
        class: 'tourism',
        type: 'hotel',
        lat: '51.5',
        lon: '-0.1',
        extratags: {},
        address: { village: 'Source Village', country: 'United Kingdom' },
      }]));
    vi.stubGlobal('fetch', fetchMock);
    const { lookupHotel, reverseGeocode, searchHotels } = await import('@/lib/nominatim');

    await expect(lookupHotel({ name: 'Town Hotel' })).resolves.toMatchObject({
      name: 'Town Hotel',
      city: 'Small Town',
      rooms: null,
      website: null,
    });
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('q')).toBe('Town Hotel');
    await expect(reverseGeocode({ lat: 51.5, lon: -0.1 })).resolves.toBeNull();
    await expect(searchHotels({ city: 'Source Village' })).resolves.toEqual([]);
  });

  it('keeps sparse Nominatim address and extratag fields explicit', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([{
      class: 'tourism',
      type: 'hotel',
      name: 'Sparse Source Hotel',
      lat: '35.0',
      lon: '139.0',
      osm_id: 789,
      osm_type: 'node',
    }]));
    vi.stubGlobal('fetch', fetchMock);
    const { searchHotels } = await import('@/lib/nominatim');

    await expect(searchHotels({ city: 'Tokyo' })).resolves.toEqual([
      {
        name: 'Sparse Source Hotel',
        lat: 35,
        lon: 139,
        city: null,
        country: null,
        countryCode: null,
        stars: null,
        rooms: null,
        wikidataId: null,
        brandWikidataId: null,
        brand: null,
        website: null,
        address: null,
        osmId: 789,
        osmType: 'node',
      },
    ]);
  });

  it('surfaces Nominatim rate limits, HTTP failures, and request timeouts explicitly', async () => {
    vi.stubGlobal('fetch', vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 429))
      .mockResolvedValueOnce(jsonResponse({}, false, 503)));
    const { searchHotels } = await import('@/lib/nominatim');

    await expect(searchHotels({ city: 'Paris' })).rejects.toThrow('Nominatim rate limited');
    await expect(searchHotels({ city: 'Paris' })).rejects.toThrow('Nominatim HTTP 503');

    vi.useFakeTimers();
    const timeoutFetch = vi.fn((_input: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    vi.stubGlobal('fetch', timeoutFetch);

    const request = searchHotels({ city: 'Paris', timeoutMs: 25 });
    const assertion = expect(request).rejects.toThrow('Nominatim request timed out after 25ms');

    await vi.advanceTimersByTimeAsync(25);
    await assertion;
  });
});

describe('Ticketmaster helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns empty events when the API key is not configured', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', '');
    const { getEvents, isConfigured } = await import('@/lib/ticketmaster');

    expect(isConfigured()).toBe(false);
    await expect(getEvents({ lat: 48.8566, lon: 2.3522 })).resolves.toEqual([]);
  });

  it('maps configured Ticketmaster events and bounds request size', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'tm_realistic_key_for_tests');
    const fetchMock = vi.fn(async () => jsonResponse({
      _embedded: {
        events: [
          {
            name: 'Paris Jazz Festival',
            url: 'https://www.ticketmaster.fr/',
            dates: { start: { localDate: '2026-07-12' } },
            classifications: [{ segment: { name: 'Music' }, genre: { name: 'Jazz' } }],
            priceRanges: [{ min: 35, max: 70, currency: 'EUR' }],
            _embedded: { venues: [{ name: 'Parc Floral de Paris' }] },
          },
          {
            name: 'Paris Basketball',
            dates: { start: { localDate: '2026-07-13' } },
            classifications: [{ segment: { name: 'Sports' }, genre: { name: 'Basketball' } }],
            priceRanges: [{ min: 25, max: 25, currency: 'EUR' }],
            _embedded: { venues: [{ name: 'Accor Arena' }] },
          },
        ],
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { getEvents, isConfigured } = await import('@/lib/ticketmaster');

    const events = await getEvents({
      lat: 48.8566,
      lon: 2.3522,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      limit: 100,
    });
    const url = new URL(String(fetchMock.mock.calls[0][0]));

    expect(isConfigured()).toBe(true);
    expect(url.searchParams.get('size')).toBe('50');
    expect(events).toEqual([
      expect.objectContaining({
        name: 'Paris Jazz Festival',
        month: 'Jul 12',
        description: 'Parc Floral de Paris · EUR 35–70',
        priceRange: 'EUR 35–70',
      }),
      expect.objectContaining({
        name: 'Paris Basketball',
        month: 'Jul 13',
        description: 'Accor Arena · From EUR 25',
        priceRange: 'From EUR 25',
      }),
    ]);
  });

  it('rejects invalid Ticketmaster coordinates before calling the provider', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'tm_realistic_key_for_tests');
    const fetchMock = vi.fn(async () => jsonResponse({ _embedded: { events: [] } }));
    vi.stubGlobal('fetch', fetchMock);
    const { getEvents } = await import('@/lib/ticketmaster');

    await expect(getEvents({ lat: 91, lon: 2.3522 })).resolves.toEqual([]);
    await expect(getEvents({ lat: 48.8566, lon: -181 })).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes Ticketmaster request bounds and ignores invalid dates', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'tm_realistic_key_for_tests');
    const fetchMock = vi.fn(async () => jsonResponse({
      _embedded: {
        events: [
          {
            name: 'Paris Opera Gala',
            dates: { start: { localDate: '2026-07-14' } },
          },
        ],
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { getEvents } = await import('@/lib/ticketmaster');

    const events = await getEvents({
      lat: '48.8566' as unknown as number,
      lon: '2.3522' as unknown as number,
      radius: 500,
      limit: -4,
      startDate: '2026-99-01',
      endDate: 'not-a-date',
    });
    const url = new URL(String(fetchMock.mock.calls[0][0]));

    expect(url.searchParams.get('radius')).toBe('250');
    expect(url.searchParams.get('size')).toBe('1');
    expect(url.searchParams.has('startDateTime')).toBe(false);
    expect(url.searchParams.has('endDateTime')).toBe(false);
    expect(events).toHaveLength(1);
  });

  it('ignores non-string Ticketmaster dates without treating them as provider failures', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'tm_realistic_key_for_tests');
    const fetchMock = vi.fn(async () => jsonResponse({
      _embedded: {
        events: [
          {
            name: 'Paris Opera Gala',
            dates: { start: { localDate: 20260714 } },
          },
        ],
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { getEvents } = await import('@/lib/ticketmaster');

    const events = await getEvents({
      lat: 48.8566,
      lon: 2.3522,
      startDate: 20260701 as unknown as string,
      endDate: null as unknown as string,
    });
    const url = new URL(String(fetchMock.mock.calls[0][0]));

    expect(url.searchParams.has('startDateTime')).toBe(false);
    expect(url.searchParams.has('endDateTime')).toBe(false);
    expect(events).toEqual([
      expect.objectContaining({
        name: 'Paris Opera Gala',
        date: '',
        month: '',
      }),
    ]);
  });

  it('drops incomplete Ticketmaster events and strips unsafe ticket URLs', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'tm_realistic_key_for_tests');
    const fetchMock = vi.fn(async () => jsonResponse({
      _embedded: {
        events: [
          {
            name: '   ',
            url: 'https://www.ticketmaster.fr/blank-name',
            dates: { start: { localDate: '2026-07-14' } },
          },
          {
            name: 'Paris Opera Gala',
            url: 'https://127.0.0.1/paris-opera-gala',
            dates: { start: { localDate: 'not-a-date' } },
            classifications: [{ segment: { name: 'Arts & Theatre' }, genre: { name: 'Opera' } }],
            priceRanges: [{ min: 0, max: 0, currency: 'EUR' }],
          },
          {
            name: 'Roland Garros Exhibition',
            url: 'https://www.ticketmaster.fr/roland-garros',
            dates: { start: { localDate: '2026-07-15' } },
            classifications: [{ segment: { name: 'Sports' }, genre: { name: 'Tennis' } }],
            priceRanges: [{ min: 40, max: 90, currency: 'EUR' }],
            _embedded: { venues: [{ name: 'Court Philippe-Chatrier' }] },
          },
        ],
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { getEvents } = await import('@/lib/ticketmaster');

    const events = await getEvents({ lat: 48.8566, lon: 2.3522, limit: 10 });

    expect(events).toEqual([
      expect.objectContaining({
        name: 'Paris Opera Gala',
        month: '',
        icon: '🎭',
        description: 'From EUR 0',
        priceRange: 'From EUR 0',
        ticketUrl: '',
      }),
      expect.objectContaining({
        name: 'Roland Garros Exhibition',
        month: 'Jul 15',
        icon: '🎾',
        description: 'Court Philippe-Chatrier · EUR 40–90',
        ticketUrl: 'https://www.ticketmaster.fr/roland-garros',
      }),
    ]);
  });

  it('maps less common Ticketmaster sport and entertainment genres without provider claims', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'tm_realistic_key_for_tests');
    const genres = [
      ['Ice Hockey Finals', 'Sports', 'Hockey', '🏒'],
      ['Open Golf Day', 'Sports', 'Golf', '⛳'],
      ['Boxing Night', 'Sports', 'Boxing', '🥊'],
      ['City Games', 'Sports', 'Cycling', '🏟️'],
      ['Film Premiere', 'Film', 'Premiere', '🎬'],
      ['Comedy Hour', 'Miscellaneous', 'Stand-Up Comedy', '😂'],
      ['Family Matinee', 'Miscellaneous', 'Family', '👨‍👩‍👧‍👦'],
      ['Circus Night', 'Miscellaneous', 'Circus', '🎪'],
    ];
    const fetchMock = vi.fn(async () => jsonResponse({
      _embedded: {
        events: genres.map(([name, segment, genre]) => ({
          name,
          dates: { start: { localDate: '2026-07-20' } },
          classifications: [{ segment: { name: segment }, genre: { name: genre } }],
        })),
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { getEvents } = await import('@/lib/ticketmaster');

    const events = await getEvents({ lat: 48.8566, lon: 2.3522, limit: 10 });

    expect(events.map((event) => [event.name, event.icon])).toEqual(
      genres.map((entry) => [entry[0], entry[3]])
    );
  });

  it('uses bounded Ticketmaster fallbacks for malformed radius values and sparse event prices', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'tm_realistic_key_for_tests');
    const fetchMock = vi.fn(async () => jsonResponse({
      _embedded: {
        events: [
          {
            name: 'American Football Night',
            dates: { start: { localDate: '2026-07-20' } },
            classifications: [{ segment: { name: 'Sports' }, genre: { name: 'Football' } }],
            priceRanges: [{ min: 12, max: 22 }],
          },
          {
            name: 'Baseball Friendly',
            dates: { start: { localDate: '2026-07-21' } },
            classifications: [{ segment: { name: 'Sports' }, genre: { name: 'Baseball' } }],
            priceRanges: [{ min: 'bad', max: 40, currency: 'EUR' }],
          },
        ],
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { getEvents } = await import('@/lib/ticketmaster');

    const events = await getEvents({
      lat: 48.8566,
      lon: 2.3522,
      radius: 'bad-radius' as unknown as number,
      limit: 'bad-limit' as unknown as number,
    });
    const url = new URL(String(fetchMock.mock.calls[0][0]));

    expect(url.searchParams.get('radius')).toBe('25');
    expect(url.searchParams.get('size')).toBe('10');
    expect(events).toEqual([
      expect.objectContaining({ name: 'American Football Night', icon: '⚽', priceRange: 'USD 12–22' }),
      expect.objectContaining({ name: 'Baseball Friendly', icon: '⚾', priceRange: '' }),
    ]);
  });

  it('returns empty Ticketmaster events for sparse successful payloads', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'tm_realistic_key_for_tests');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ _embedded: {} })));
    const { getEvents } = await import('@/lib/ticketmaster');

    await expect(getEvents({ lat: 48.8566, lon: 2.3522 })).resolves.toEqual([]);
  });

  it('degrades to empty events when the upstream response is unavailable', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'tm_realistic_key_for_tests');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, false, 503)));
    const { getEvents } = await import('@/lib/ticketmaster');

    await expect(getEvents({ lat: 48.8566, lon: 2.3522 })).resolves.toEqual([]);

    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network unavailable');
    }));
    await expect(getEvents({ lat: 48.8566, lon: 2.3522 })).resolves.toEqual([]);
  });

  it('returns empty Ticketmaster events when provider payload mapping fails', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'tm_realistic_key_for_tests');
    const throwingEvent = {};
    Object.defineProperty(throwingEvent, 'name', {
      get() {
        throw new Error('event name unavailable');
      },
    });
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      _embedded: { events: [throwingEvent] },
    })));
    const { getEvents } = await import('@/lib/ticketmaster');

    await expect(getEvents({ lat: 48.8566, lon: 2.3522 })).resolves.toEqual([]);
  });
});
