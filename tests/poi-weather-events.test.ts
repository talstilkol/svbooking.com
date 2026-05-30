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
});

describe('Nominatim hotel search helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('degrades to empty events when the upstream response is unavailable', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'tm_realistic_key_for_tests');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, false, 503)));
    const { getEvents } = await import('@/lib/ticketmaster');

    await expect(getEvents({ lat: 48.8566, lon: 2.3522 })).resolves.toEqual([]);
  });
});
