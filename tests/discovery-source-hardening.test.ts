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
});
