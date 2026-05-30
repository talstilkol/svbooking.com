import { afterEach, describe, expect, it, vi } from 'vitest';
import { HotelDatabase, hotelDb } from '@/lib/hotel-db';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn(async () => body),
  };
}

describe('HotelDatabase static catalog adapter', () => {
  it('returns a singleton database with current catalog counts and sorted facets', async () => {
    const db = HotelDatabase.getInstance();

    expect(db).toBe(hotelDb);
    await expect(db.count()).resolves.toBe(502);
    await expect(db.getCities()).resolves.toContain('Paris');
    await expect(db.getCountries()).resolves.toContain('France');
  });

  it('searches by city, country, query, limit, and offset', async () => {
    const db = HotelDatabase.getInstance();

    const parisHotels = await db.search({ city: 'paris', limit: 2 });
    const franceHotels = await db.search({ country: 'france', query: 'hotel', limit: 3, offset: 1 });
    const leMeurice = await db.getByKey('g187147-d188728');

    expect(parisHotels).toHaveLength(2);
    expect(parisHotels.every((hotel) => hotel.city === 'Paris')).toBe(true);
    expect(franceHotels).toHaveLength(3);
    expect(franceHotels.every((hotel) => hotel.country === 'France')).toBe(true);
    expect(leMeurice).toMatchObject({
      hotelKey: 'g187147-d188728',
      name: 'Le Meurice',
      coordinates: { lat: 48.8566, lng: 2.3522 },
    });
    await expect(db.getByKey('unknown')).resolves.toBeNull();
  });

  it('keeps unknown city coordinates explicit instead of fabricating a location', async () => {
    const db = HotelDatabase.getInstance();
    const hotels = await db.getAll();
    const hotelWithoutKnownCoordinates = hotels.find((hotel) => hotel.city === 'Abu Dhabi');

    expect(hotelWithoutKnownCoordinates?.coordinates).toEqual({ lat: 0, lng: 0 });
  });
});

describe('Wikipedia content helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('normalizes page summaries with images, links, and coordinates', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      title: 'Paris',
      description: 'Capital of France',
      extract: 'Paris is the capital and most populous city of France.',
      extract_html: '<p>Paris is the capital and most populous city of France.</p>',
      thumbnail: { source: 'https://upload.wikimedia.org/paris-thumb.jpg' },
      originalimage: { source: 'https://upload.wikimedia.org/paris.jpg' },
      content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Paris' } },
      coordinates: { lat: 48.8566, lon: 2.3522 },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { getSummary } = await import('@/lib/wikipedia');

    await expect(getSummary('Paris')).resolves.toMatchObject({
      title: 'Paris',
      description: 'Capital of France',
      thumbnail: 'https://upload.wikimedia.org/paris-thumb.jpg',
      originalImage: 'https://upload.wikimedia.org/paris.jpg',
      url: 'https://en.wikipedia.org/wiki/Paris',
      coordinates: { lat: 48.8566, lon: 2.3522 },
    });
  });

  it('returns null for missing summaries and skips failed batch items', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ type: 'not_found' }))
      .mockResolvedValueOnce(jsonResponse({ title: 'Paris', extract: 'Paris summary.' }))
      .mockRejectedValueOnce(new Error('upstream unavailable'));
    vi.stubGlobal('fetch', fetchMock);
    const { batchSummaries, getSummary } = await import('@/lib/wikipedia');

    await expect(getSummary('Missing Article')).resolves.toBeNull();
    const summaries = await batchSummaries(['Paris', 'Unavailable']);

    expect(summaries.size).toBe(1);
    expect(summaries.get('Paris')).toMatchObject({ title: 'Paris', extract: 'Paris summary.' });
  });

  it('strips HTML snippets from search results and reports invalid/HTTP failures', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      query: {
        search: [
          { title: 'Paris', snippet: '<span>Capital</span> of France', wordcount: 1200 },
        ],
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { getSummary, search } = await import('@/lib/wikipedia');

    await expect(search('Paris', 1)).resolves.toEqual([
      { title: 'Paris', snippet: 'Capital of France', wordcount: 1200 },
    ]);
    await expect(getSummary('')).rejects.toThrow('Title is required');

    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, false, 500)));
    await expect(getSummary('Paris')).rejects.toThrow('Wikipedia HTTP 500');
  });
});

describe('OpenTripMap helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('discovers attractions, preserves zero longitude, and sorts by quality before distance', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([
      { xid: 'G1', name: 'Royal Observatory Greenwich', point: { lat: 51.4769, lon: 0 }, kinds: 'museums', rate: 1 },
      { xid: 'L1', name: 'Louvre Museum', point: { lat: 48.8606, lon: 2.3376 }, kinds: 'museums', rate: 3, wikidata: 'Q19675' },
      { xid: 'E1', name: '', point: { lat: 48.8584, lon: 2.2945 }, kinds: 'architecture', rate: 3 },
      { xid: 'B1', name: 'Bad Coordinate POI', point: { lat: 91, lon: 181 }, kinds: 'historic', rate: 3 },
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const { getAttractions, getTopAttractions } = await import('@/lib/opentripmap');

    const attractions = await getAttractions({ lat: 51.4769, lon: 0, limit: 5 });
    const top = await getTopAttractions({ lat: 51.4769, lon: 0, limit: 5 });

    expect(attractions[0]).toMatchObject({ name: 'Louvre Museum', rate: 3, type: 'Museum' });
    expect(attractions[1]).toMatchObject({ name: 'Royal Observatory Greenwich', lat: 51.4769, lon: 0, distanceM: 0 });
    expect(top.map((item) => item.name)).toEqual(['Louvre Museum']);
    expect(attractions.map((item) => item.name)).not.toContain('Bad Coordinate POI');
  });

  it('bounds OpenTripMap request inputs before provider access', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);
    const { getAttractions, getTopAttractions } = await import('@/lib/opentripmap');

    await expect(getAttractions({
      lat: '91' as unknown as number,
      lon: 0,
      radius: 999999,
      kinds: 'museums, bad kind, historic); DROP',
      limit: 999,
    })).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();

    await getAttractions({
      lat: 48.8566,
      lon: 2.3522,
      radius: 999999,
      kinds: 'museums, bad kind, historic',
      limit: 999,
    });
    const radiusUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(radiusUrl.searchParams.get('radius')).toBe('25000');
    expect(radiusUrl.searchParams.get('limit')).toBe('60');
    expect(radiusUrl.searchParams.get('kinds')).toBe('museums,historic');

    await getTopAttractions({ lat: 48.8566, lon: 2.3522, limit: -10 });
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get('limit')).toBe('40');
  });

  it('loads place details and degrades to null for unavailable details', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        xid: 'L1',
        name: 'Louvre Museum',
        wikipedia_extracts: { text: 'The Louvre is a museum in Paris.' },
        preview: { source: 'https://upload.wikimedia.org/louvre.jpg' },
        wikipedia: 'https://en.wikipedia.org/wiki/Louvre',
        rate: 3,
        kinds: 'museums,cultural',
        address: { city: 'Paris' },
      }))
      .mockResolvedValueOnce(jsonResponse({}, true));
    vi.stubGlobal('fetch', fetchMock);
    const { getPlaceDetails } = await import('@/lib/opentripmap');

    await expect(getPlaceDetails('L1')).resolves.toMatchObject({
      xid: 'L1',
      name: 'Louvre Museum',
      description: 'The Louvre is a museum in Paris.',
      imageUrl: 'https://upload.wikimedia.org/louvre.jpg',
      wikipediaUrl: 'https://en.wikipedia.org/wiki/Louvre',
      rate: 3,
    });
    await expect(getPlaceDetails('')).resolves.toBeNull();
    await expect(getPlaceDetails('missing')).resolves.toBeNull();
  });

  it('sanitizes OpenTripMap detail IDs and URLs before returning details', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      xid: 'L1',
      name: ' Louvre  Museum ',
      wikipedia_extracts: { text: ' Louvre details ' },
      preview: { source: 'javascript:alert(1)' },
      image: 'http://images.example/louvre.jpg',
      wikipedia: 'http://en.wikipedia.org/wiki/Louvre',
      rate: 99,
      kinds: 'museums, bad kind, cultural',
      address: { city: 'Paris' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { getPlaceDetails } = await import('@/lib/opentripmap');

    await expect(getPlaceDetails('../bad')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    await expect(getPlaceDetails('L1')).resolves.toMatchObject({
      xid: 'L1',
      name: 'Louvre Museum',
      description: 'Louvre details',
      imageUrl: null,
      wikipediaUrl: null,
      rate: 3,
      kinds: 'museums,cultural',
    });
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.opentripmap.com/0.1/en/places/xid/L1');
  });
});
