import { afterEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Unavailable',
    json: vi.fn(async () => body),
  };
}

function capturedQuery(fetchMock: ReturnType<typeof vi.fn>, callIndex = 0) {
  const input = fetchMock.mock.calls[callIndex]?.[0];
  if (!input) throw new Error('Expected fetch call');
  return new URL(String(input)).searchParams.get('query') || new URL(String(input)).searchParams.get('data') || '';
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.useRealTimers();
  delete process.env.RAPIDAPI_KEY;
});

describe('Overpass hotel discovery hardening', () => {
  it('preserves zero coordinates and rejects missing coordinate inputs', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      elements: [
        {
          type: 'node',
          id: 1,
          lat: 0,
          lon: 0,
          tags: { name: 'Equator Hotel', stars: '4', website: 'https://equator.example.invalid' },
        },
        {
          type: 'way',
          id: 2,
          center: { lat: 51.4769, lon: 0 },
          tags: { 'name:en': 'Royal Observatory Hotel', wikidata: 'Q1', rooms: '12' },
        },
        { type: 'node', id: 3, lat: 10, lon: 10, tags: { tourism: 'hotel' } },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { discoverHotels, discoverHotelsNearby, countHotels } = await import('@/lib/overpass');

    const hotels = await discoverHotels({ city: 'London"\\', limit: 5 });

    expect(hotels).toEqual([
      expect.objectContaining({ name: 'Equator Hotel', lat: 0, lon: 0, stars: 4 }),
      expect.objectContaining({ name: 'Royal Observatory Hotel', lat: 51.4769, lon: 0, rooms: 12 }),
    ]);
    expect(capturedQuery(fetchMock)).not.toContain('"\\');
    await expect(discoverHotelsNearby({ lat: Number.NaN, lon: 0 })).rejects.toThrow('Latitude and longitude are required');
    await expect(countHotels({ city: '' })).rejects.toThrow('City name is required');
  });

  it('builds narrowed Wikidata-only queries and parses optional hotel metadata', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        elements: [
          {
            type: 'relation',
            id: 44,
            center: { lat: 48.8566, lon: 2.3522 },
            tags: {
              name: 'Grand Hotel',
              brand: 'Grand Brand',
              wikidata: 'Q123',
              'brand:wikidata': 'Q456',
              'contact:website': 'https://grand.example.invalid',
              'contact:phone': '+33100000000',
              operator: 'Grand Operator',
            },
          },
        ],
      }))
      .mockResolvedValueOnce(jsonResponse({
        elements: [
          {
            type: 'node',
            id: 45,
            lat: 48.85,
            lon: 2.35,
            tags: {
              name: 'Nearby Hotel',
              wikidata: 'Q789',
              phone: '+33111111111',
              website: 'https://nearby.example.invalid',
            },
          },
        ],
      }))
      .mockResolvedValueOnce(jsonResponse({ elements: [{ tags: { total: '12' } }] }))
      .mockResolvedValueOnce(jsonResponse({ elements: [{}] }));
    vi.stubGlobal('fetch', fetchMock);
    const { discoverHotels, discoverHotelsNearby, countHotels } = await import('@/lib/overpass');

    const cityHotels = await discoverHotels({
      city: 'Paris"\\',
      country: 'France"\\',
      wikidataOnly: true,
      limit: 7,
    });
    const nearbyHotels = await discoverHotelsNearby({
      lat: 48.8566,
      lon: 2.3522,
      radiusKm: 3,
      limit: 4,
    });

    expect(capturedQuery(fetchMock, 0)).toContain('area["name"="Paris"]');
    expect(capturedQuery(fetchMock, 0)).toContain('area["name:en"="France"]');
    expect(capturedQuery(fetchMock, 0)).toContain('["wikidata"]');
    expect(capturedQuery(fetchMock, 0)).toContain('out body 7');
    expect(cityHotels).toEqual([
      expect.objectContaining({
        name: 'Grand Hotel',
        lat: 48.8566,
        lon: 2.3522,
        brand: 'Grand Brand',
        wikidataId: 'Q123',
        brandWikidataId: 'Q456',
        website: 'https://grand.example.invalid',
        phone: '+33100000000',
        operator: 'Grand Operator',
      }),
    ]);
    expect(capturedQuery(fetchMock, 1)).toContain('around:3000,48.8566,2.3522');
    expect(capturedQuery(fetchMock, 1)).toContain('out body 4');
    expect(nearbyHotels[0]).toMatchObject({
      name: 'Nearby Hotel',
      wikidataId: 'Q789',
      phone: '+33111111111',
      website: 'https://nearby.example.invalid',
    });
    await expect(countHotels({ city: 'Paris' })).resolves.toBe(12);
    await expect(countHotels({ city: 'Paris' })).resolves.toBe(0);
  });

  it('surfaces Overpass rate limits, HTTP failures, empty responses, and timeouts without fabricating hotels', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 429))
      .mockResolvedValueOnce(jsonResponse({}, false, 503))
      .mockResolvedValueOnce(jsonResponse({ elements: [] }))
      .mockImplementationOnce((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }));
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
    const { discoverHotels, countHotels } = await import('@/lib/overpass');

    await expect(discoverHotels({ city: 'Paris' })).rejects.toThrow('Overpass rate limited');
    await expect(discoverHotels({ city: 'Paris' })).rejects.toThrow('Overpass HTTP 503');
    await expect(discoverHotels({ city: 'Paris' })).resolves.toEqual([]);

    const timedOut = expect(countHotels({ city: 'Paris', timeoutMs: 25 }))
      .rejects.toThrow('Overpass request timed out after 25ms');
    await vi.advanceTimersByTimeAsync(25);
    await timedOut;
  });
});

describe('Xotelo discovery hardening', () => {
  it('keeps only keyed hotels with sourced names and deduplicates discovery results', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      result: [
        { hotel_key: 'g187147-d188728', name: 'Le Meurice', city: 'Paris', country: 'France', stars: 5 },
        { hotel_key: 'g187147-d197601', city: 'Paris', country: 'France' },
        { name: 'Hotel Lutetia', city: 'Paris', country: 'France' },
        { hotel_key: 'g187147-d188728', hotel_name: 'Le Meurice', city: 'Paris', country: 'France' },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { discoverFromXotelo, isXoteloDiscoveryConfigured, listXoteloHotels, searchXoteloHotels } = await import('@/lib/xotelo-discovery');

    await expect(searchXoteloHotels('Paris')).resolves.toEqual([
      expect.objectContaining({ hotelKey: 'g187147-d188728', name: 'Le Meurice', source: 'xotelo-search' }),
      expect.objectContaining({ hotelKey: 'g187147-d188728', name: 'Le Meurice', source: 'xotelo-search' }),
    ]);
    await expect(listXoteloHotels('Paris')).resolves.toEqual([
      expect.objectContaining({ hotelKey: 'g187147-d188728', name: 'Le Meurice', source: 'xotelo-list' }),
      expect.objectContaining({ hotelKey: 'g187147-d188728', name: 'Le Meurice', source: 'xotelo-list' }),
    ]);
    await expect(discoverFromXotelo(['Paris', 'Paris'], 0)).resolves.toEqual([
      expect.objectContaining({ hotelKey: 'g187147-d188728', name: 'Le Meurice', city: 'Paris' }),
    ]);
    expect(isXoteloDiscoveryConfigured()).toBe(false);
  });

  it('fails closed for missing inputs and unusable Xotelo discovery responses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 401))
      .mockResolvedValueOnce(jsonResponse({ error: 'unauthorized' }))
      .mockResolvedValueOnce(jsonResponse({ result: { hotel_key: 'g1-d1' } }))
      .mockRejectedValueOnce(new Error('network unavailable'));
    vi.stubGlobal('fetch', fetchMock);
    const { listXoteloHotels, searchXoteloHotels } = await import('@/lib/xotelo-discovery');

    await expect(searchXoteloHotels('')).resolves.toEqual([]);
    await expect(listXoteloHotels('')).resolves.toEqual([]);
    await expect(searchXoteloHotels('Paris')).resolves.toEqual([]);
    await expect(listXoteloHotels('Paris')).resolves.toEqual([]);
    await expect(searchXoteloHotels('Paris')).resolves.toEqual([]);
    await expect(listXoteloHotels('Paris')).resolves.toEqual([]);
  });

  it('uses RapidAPI discovery configuration and alternate Xotelo result fields', async () => {
    vi.stubEnv('RAPIDAPI_KEY', 'rapidapi_realistic_test_key');
    const fetchMock = vi.fn(async () => jsonResponse({
      data: [
        {
          key: 'g294217-d299320',
          hotel_name: 'The Fullerton Hotel Singapore',
          location: { city: 'Singapore', country: 'Singapore' },
          stars: 5,
        },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { isXoteloDiscoveryConfigured, searchXoteloHotels } = await import('@/lib/xotelo-discovery');

    const hotels = await searchXoteloHotels('Singapore');
    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]));
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit & { headers: Record<string, string> };

    expect(isXoteloDiscoveryConfigured()).toBe(true);
    expect(requestedUrl.hostname).toBe('xotelo.p.rapidapi.com');
    expect(requestedUrl.searchParams.get('q')).toBe('Singapore');
    expect(requestInit.cache).toBe('no-store');
    expect(requestInit.headers['x-rapidapi-key']).toBe('rapidapi_realistic_test_key');
    expect(requestInit.headers['x-rapidapi-host']).toBe('xotelo.p.rapidapi.com');
    expect(hotels).toEqual([
      {
        hotelKey: 'g294217-d299320',
        name: 'The Fullerton Hotel Singapore',
        city: 'Singapore',
        country: 'Singapore',
        stars: 5,
        source: 'xotelo-search',
      },
    ]);
  });
});

describe('Wikidata enrichment hardening', () => {
  it('filters unsafe identifiers before building SPARQL values and parses enrichment metadata', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      results: {
        bindings: [
          {
            taId: { value: '188728' },
            bookingId: { value: 'le-meurice' },
            expediaId: { value: '12345' },
            website: { value: 'https://www.dorchestercollection.com/paris/le-meurice/' },
            image: { value: 'https://upload.wikimedia.org/le-meurice.jpg' },
            hotelLabel: { value: 'Le Meurice' },
            coord: { value: 'Point(0 48.865)' },
          },
        ],
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { buildBookingUrl, enrichFromWikidata } = await import('@/lib/wikidata-enrich');

    const enriched = await enrichFromWikidata(['188728', '188728', 'bad" . ?s ?p ?o', 'abc']);
    const query = capturedQuery(fetchMock);

    expect(query).toContain('VALUES ?taId { "188728" }');
    expect(query).not.toContain('bad"');
    expect(enriched.get('188728')).toMatchObject({
      bookingSlug: 'le-meurice',
      expediaId: '12345',
      wikidataName: 'Le Meurice',
      lon: 0,
      lat: 48.865,
    });
    expect(buildBookingUrl('fr/hotel paris?ref=x', '2026-06-01', '2026-06-03'))
      .toBeNull();
    expect(buildBookingUrl('fr/hotel-paris', '2026-06-01', '2026-06-03'))
      .toBe('https://www.booking.com/hotel/fr/hotel-paris.html?checkin=2026-06-01&checkout=2026-06-03&no_rooms=1&group_adults=2');
    expect(buildBookingUrl('fr/hotel-paris', '2026-06-03', '2026-06-01'))
      .toBe('https://www.booking.com/hotel/fr/hotel-paris.html');
    expect(buildBookingUrl('fr/hotel-paris', '2026-02-31', '2026-03-02'))
      .toBe('https://www.booking.com/hotel/fr/hotel-paris.html');
  });

  it('drops unsafe Wikidata enrichment fields before returning them', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      results: {
        bindings: [
          {
            taId: { value: '188728' },
            bookingId: { value: 'javascript:alert(1)' },
            expediaId: { value: ' 12345 ' },
            website: { value: 'https://127.0.0.1/admin' },
            image: { value: 'https://[::ffff:127.0.0.1]/internal.jpg' },
            hotelLabel: { value: ' Le  Meurice ' },
            coord: { value: 'Point(181 91)' },
          },
          {
            taId: { value: '188729' },
            bookingId: { value: 'fr/ritz-paris' },
            website: { value: 'https://www.ritzparis.com/' },
            image: { value: 'https://upload.wikimedia.org/ritz-paris.jpg' },
            coord: { value: 'Point(2.3286 48.868)' },
          },
          {
            taId: { value: 'bad-id' },
            bookingId: { value: 'fr/not-returned' },
          },
        ],
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { enrichFromWikidata } = await import('@/lib/wikidata-enrich');

    const enriched = await enrichFromWikidata(['188728', '188729']);

    expect(enriched.get('188728')).toEqual({
      expediaId: '12345',
      wikidataName: 'Le Meurice',
    });
    expect(enriched.get('188729')).toMatchObject({
      bookingSlug: 'fr/ritz-paris',
      officialWebsite: 'https://www.ritzparis.com/',
      image: 'https://upload.wikimedia.org/ritz-paris.jpg',
      lon: 2.3286,
      lat: 48.868,
    });
    expect(enriched.has('bad-id')).toBe(false);
  });

  it('normalizes Wikidata IDs before resolving TripAdvisor IDs', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      results: {
        bindings: [
          {
            item: { value: 'http://www.wikidata.org/entity/Q19675' },
            taId: { value: '188728' },
            adminAreaTAId: { value: '187147' },
            adminAreaLabel: { value: 'Paris' },
          },
        ],
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { resolveWikidataToTripAdvisor } = await import('@/lib/wikidata-enrich');

    const resolved = await resolveWikidataToTripAdvisor(['q19675', 'P31', 'Q2"']);
    const query = capturedQuery(fetchMock);

    expect(query).toContain('VALUES ?item { wd:Q19675 }');
    expect(query).not.toContain('wd:P31');
    expect(query).not.toContain('Q2"');
    expect(resolved.get('Q19675')).toEqual({
      tripAdvisorId: '188728',
      cityTripAdvisorId: '187147',
      cityName: 'Paris',
    });
  });

  it('drops malformed Wikidata resolve rows returned by the provider', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      results: {
        bindings: [
          {
            item: { value: 'http://www.wikidata.org/entity/Q19675' },
            taId: { value: 'bad-ta' },
            adminAreaTAId: { value: '187147' },
            adminAreaLabel: { value: 'Paris' },
          },
          {
            item: { value: 'http://www.wikidata.org/entity/P31' },
            taId: { value: '188728' },
          },
          {
            item: { value: 'http://www.wikidata.org/entity/Q19676' },
            taId: { value: '188729' },
            adminAreaTAId: { value: 'bad-city' },
            adminAreaLabel: { value: ' Paris  France ' },
          },
        ],
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { resolveWikidataToTripAdvisor } = await import('@/lib/wikidata-enrich');

    const resolved = await resolveWikidataToTripAdvisor(['Q19675', 'Q19676']);

    expect(resolved.has('Q19675')).toBe(false);
    expect(resolved.has('P31')).toBe(false);
    expect(resolved.get('Q19676')).toEqual({
      tripAdvisorId: '188729',
      cityTripAdvisorId: null,
      cityName: 'Paris France',
    });
  });

  it('does not call Wikidata when enrichment or resolve inputs have no valid identifiers', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { enrichFromWikidata, resolveWikidataToTripAdvisor, buildBookingUrl } = await import('@/lib/wikidata-enrich');

    await expect(enrichFromWikidata(['abc', 'P31', 'bad-id'])).resolves.toEqual(new Map());
    await expect(resolveWikidataToTripAdvisor(['P31', 'not-a-qid', 'Qbad'])).resolves.toEqual(new Map());
    expect(buildBookingUrl('', '2026-06-01', '2026-06-03')).toBeNull();
    expect(buildBookingUrl('fr//hotel-paris', '2026-06-01', '2026-06-03')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns empty enrichment maps when Wikidata requests fail', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'unavailable' }, false, 503)));
    const { enrichFromWikidata, resolveWikidataToTripAdvisor } = await import('@/lib/wikidata-enrich');

    await expect(enrichFromWikidata(['188728'])).resolves.toEqual(new Map());
    await expect(resolveWikidataToTripAdvisor(['Q19675'])).resolves.toEqual(new Map());
    expect(consoleSpy).toHaveBeenCalledWith('Wikidata enrichment unavailable');
    expect(consoleSpy).toHaveBeenCalledWith('Wikidata resolve unavailable');
    consoleSpy.mockRestore();
  });

  it('chunks large Wikidata enrichment and resolve requests deterministically', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        results: {
          bindings: [
            { taId: { value: '1000' }, bookingId: { value: 'fr/le-meurice' } },
          ],
        },
      }))
      .mockResolvedValueOnce(jsonResponse({ results: { bindings: [] } }))
      .mockResolvedValueOnce(jsonResponse({
        results: {
          bindings: [
            {
              item: { value: 'http://www.wikidata.org/entity/Q1000' },
              taId: { value: '188728' },
            },
          ],
        },
      }))
      .mockResolvedValueOnce(jsonResponse({ results: { bindings: [] } }));
    vi.stubGlobal('fetch', fetchMock);
    const { enrichFromWikidata, resolveWikidataToTripAdvisor } = await import('@/lib/wikidata-enrich');

    const enrichmentPromise = enrichFromWikidata(Array.from({ length: 41 }, (_, index) => String(1000 + index)));
    await vi.runAllTimersAsync();
    await expect(enrichmentPromise).resolves.toEqual(new Map([
      ['1000', { bookingSlug: 'fr/le-meurice' }],
    ]));

    const resolvePromise = resolveWikidataToTripAdvisor(Array.from({ length: 51 }, (_, index) => `Q${1000 + index}`));
    await vi.runAllTimersAsync();
    await expect(resolvePromise).resolves.toEqual(new Map([
      ['Q1000', { tripAdvisorId: '188728', cityTripAdvisorId: null, cityName: null }],
    ]));

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(capturedQuery(fetchMock, 0).match(/"\d+"/g)).toHaveLength(40);
    expect(capturedQuery(fetchMock, 1).match(/"\d+"/g)).toHaveLength(1);
    expect(capturedQuery(fetchMock, 2).match(/wd:Q\d+/g)).toHaveLength(50);
    expect(capturedQuery(fetchMock, 3).match(/wd:Q\d+/g)).toHaveLength(1);
  });
});

describe('Wikidata discovery and DBpedia SPARQL hardening', () => {
  it('skips Wikidata hotel discovery rows that lack sourced labels', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      results: {
        bindings: [
          {
            hotelLabel: { value: 'Hotel Lutetia' },
            tripAdvisorId: { value: '197601' },
            adminAreaLabel: { value: 'Paris' },
            cityTAId: { value: '187147' },
            countryLabel: { value: 'France' },
          },
          {
            tripAdvisorId: { value: '188728' },
            adminAreaLabel: { value: 'Paris' },
            cityTAId: { value: '187147' },
            countryLabel: { value: 'France' },
          },
        ],
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { discoverHotels } = await import('@/lib/wikidata');

    await expect(discoverHotels({ city: 'Paris', limit: 10 })).resolves.toEqual([
      expect.objectContaining({ hotelKey: 'g187147-d197601', name: 'Hotel Lutetia', city: 'Paris', country: 'France' }),
    ]);
  });

  it('escapes DBpedia city filters, bounds limits, and deduplicates named hotels', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        results: {
          bindings: [
            {
              hotel: { value: 'http://dbpedia.org/resource/Le_Meurice' },
              name: { value: 'Le Meurice' },
              abstract: { value: 'Le Meurice is a historic palace hotel in Paris.'.repeat(10) },
              lat: { value: '48.865' },
              lon: { value: '2.328' },
              wikidata: { value: 'http://www.wikidata.org/entity/Q1585817' },
            },
            {
              hotel: { value: 'http://dbpedia.org/resource/Le_Meurice' },
              name: { value: 'Le Meurice' },
            },
          ],
        },
      }))
      .mockResolvedValueOnce(jsonResponse({
        results: {
          bindings: [
            {
              name: { value: 'Unsafe Coordinate Hotel' },
              lat: { value: '999' },
              lon: { value: '-999' },
              wikidata: { value: 'http://www.wikidata.org/entity/not-a-qid' },
              locName: { value: 'Paris' },
            },
          ],
        },
      }));
    vi.stubGlobal('fetch', fetchMock);
    const { discoverHotelsDBpedia, getAllHotelsWithWikidata } = await import('@/lib/dbpedia');

    const hotels = await discoverHotelsDBpedia({ city: 'Paris" . ?evil ?p ?o', limit: 9999 });
    const allHotels = await getAllHotelsWithWikidata(-5);
    const discoveryQuery = capturedQuery(fetchMock, 0);
    const allHotelsQuery = capturedQuery(fetchMock, 1);

    expect(discoveryQuery).toContain('LCASE("Paris\\" . ?evil ?p ?o")');
    expect(discoveryQuery).toContain('LIMIT 500');
    expect(allHotelsQuery).toContain('LIMIT 100');
    expect(hotels).toEqual([
      expect.objectContaining({
        name: 'Le Meurice',
        lat: 48.865,
        lon: 2.328,
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Le_Meurice',
        wikidataId: 'Q1585817',
      }),
    ]);
    expect(allHotels).toEqual([
      {
        name: 'Unsafe Coordinate Hotel',
        lat: null,
        lon: null,
        wikidataId: null,
        city: 'Paris',
      },
    ]);
  });
});

describe('Wikivoyage parser hardening', () => {
  it('returns null for empty or unavailable Wikivoyage travel guide summaries', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ type: 'not_found' }))
      .mockResolvedValueOnce(jsonResponse({ type: 'no-extract' }))
      .mockResolvedValueOnce(jsonResponse({}, false, 503));
    vi.stubGlobal('fetch', fetchMock);
    const { getTravelGuide } = await import('@/lib/wikivoyage');

    await expect(getTravelGuide('')).resolves.toBeNull();
    await expect(getTravelGuide('Missing City')).resolves.toBeNull();
    await expect(getTravelGuide('No Extract')).resolves.toBeNull();
    await expect(getTravelGuide('Unavailable')).resolves.toBeNull();
  });

  it('drops unsafe travel guide media URLs', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      title: 'Paris',
      extract: 'Paris travel guide.',
      thumbnail: { source: 'http://upload.wikimedia.org/paris.jpg' },
      content_urls: { desktop: { page: 'https://user:pass@en.wikivoyage.org/wiki/Paris' } },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { getTravelGuide } = await import('@/lib/wikivoyage');

    await expect(getTravelGuide('Paris')).resolves.toEqual({
      title: 'Paris',
      extract: 'Paris travel guide.',
      thumbnail: null,
      url: null,
    });
  });

  it('degrades cleanly when Wikivoyage summary, section list, or section content fetches fail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('Wikivoyage unavailable');
    }));
    const { getDiningInfo, getEventInfo, getSafetyInfo, getTravelGuide } = await import('@/lib/wikivoyage');

    await expect(getTravelGuide('Paris')).resolves.toBeNull();
    await expect(getSafetyInfo('Paris')).resolves.toBeNull();
    await expect(getEventInfo('Paris')).resolves.toEqual([]);
    await expect(getDiningInfo('Paris')).resolves.toBeNull();

    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('prop=sections')) {
        return jsonResponse({ parse: { sections: [{ index: '10', line: 'Stay safe', level: '2' }] } });
      }
      throw new Error('Wikivoyage section unavailable');
    }));

    await expect(getSafetyInfo('Paris')).resolves.toBeNull();
  });

  it('returns only safety and health facts that are present in source sections', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('prop=sections')) {
        return jsonResponse({
          parse: {
            sections: [
              { index: '10', line: 'Stay safe', level: '2' },
              { index: '11', line: 'Stay healthy', level: '2' },
            ],
          },
        });
      }
      if (url.includes('section=10')) {
        return jsonResponse({ parse: { text: { '*': '<p>Avoid Northern Station late at night. Central Paris is generally safe for visitors.</p>' } } });
      }
      return jsonResponse({ parse: { text: { '*': '<p>Tap water is safe to drink. Vaccination guidance depends on traveler history.</p>' } } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { getSafetyInfo } = await import('@/lib/wikivoyage');

    await expect(getSafetyInfo('Paris')).resolves.toMatchObject({
      tips: [
        'Avoid Northern Station late at night.',
        'Central Paris is generally safe for visitors.',
      ],
      waterSafety: 'Tap water is safe to drink',
    });
  });

  it('does not invent event, dining, or medical fallback copy when Wikivoyage text lacks it', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('prop=sections')) {
        return jsonResponse({
          parse: {
            sections: [
              { index: '1', line: 'Do', level: '2' },
              { index: '2', line: 'Eat', level: '2' },
              { index: '3', line: 'Stay healthy', level: '2' },
            ],
          },
        });
      }
      if (url.includes('section=1')) return jsonResponse({ parse: { text: { '*': '<p><b>Paris Jazz Festival</b></p>' } } });
      if (url.includes('section=2')) return jsonResponse({ parse: { text: { '*': '<p><b>Epicure</b></p>' } } });
      return jsonResponse({ parse: { text: { '*': '<p>Hospitals are available across central districts.</p>' } } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { getDiningInfo, getEventInfo, getSafetyInfo } = await import('@/lib/wikivoyage');

    await expect(getEventInfo('Paris')).resolves.toEqual([
      { name: 'Paris Jazz Festival', month: '', icon: '🎉', description: null },
    ]);
    await expect(getDiningInfo('Paris')).resolves.toEqual([
      { name: 'Epicure', description: null, type: 'restaurant' },
    ]);
    await expect(getSafetyInfo('Paris')).resolves.toBeNull();
  });

  it('parses sourced Wikivoyage health warnings, events, and dining descriptions without fallback copy', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('prop=sections')) {
        return jsonResponse({
          parse: {
            sections: [
              { index: '1', line: 'Safety', level: '2' },
              { index: '2', line: 'Stay healthy', level: '2' },
              { index: '3', line: 'Understand', level: '2' },
              { index: '4', line: 'Eat', level: '2' },
            ],
          },
        });
      }
      if (url.includes('section=1')) {
        return jsonResponse({ parse: { text: { '*': '<p>Old Town is dangerous after midnight. Wikivoyage contributors update listings.</p>' } } });
      }
      if (url.includes('section=2')) {
        return jsonResponse({ parse: { text: { '*': '<p>Vaccinations are recommended for some travelers. Tap water is not safe; bottled water is common.</p>' } } });
      }
      if (url.includes('section=3')) {
        return jsonResponse({ parse: { text: { '*': '<p>The city hosts the <b>Lantern Festival</b> in February with music and food events.</p><p><b>Lantern Festival</b> appears twice.</p><p><b>The</b></p>' } } });
      }
      return jsonResponse({ parse: { text: { '*': '<p><b>Market Kitchen</b> &amp; tea house serves regional dishes near the station.</p><p><b>AB</b></p></p>' } } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { getDiningInfo, getEventInfo, getSafetyInfo } = await import('@/lib/wikivoyage');

    await expect(getSafetyInfo('Source City')).resolves.toMatchObject({
      tips: ['Old Town is dangerous after midnight.'],
      areas: [{ name: 'Old Town', safe: false, note: 'Exercise caution' }],
      vaccinations: 'Vaccinations are recommended for some travelers.',
      waterSafety: 'Drink bottled water',
    });
    await expect(getEventInfo('Source City')).resolves.toEqual([
      expect.objectContaining({
        name: 'Lantern Festival',
        month: 'Feb',
        icon: '🎉',
      }),
    ]);
    await expect(getDiningInfo('Source City')).resolves.toEqual([
      expect.objectContaining({
        name: 'Market Kitchen',
        description: expect.stringContaining('& tea house serves regional dishes near the station.'),
        type: 'restaurant',
      }),
    ]);
  });
});
