import { afterEach, describe, expect, it, vi } from 'vitest';
import { countAvailableHotels, discoverHotels, getCityGeoIds } from '@/lib/wikidata';

function stubWikidata(payload: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function capturedQuery(fetchMock: ReturnType<typeof stubWikidata>, callIndex = 0) {
  const input = (fetchMock.mock.calls as unknown[][])[callIndex]?.[0];
  if (!input) throw new Error('Expected Wikidata fetch call');
  return new URL(String(input)).searchParams.get('query') || '';
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Wikidata client hardening', () => {
  it('escapes country and city filters while preserving verified result parsing', async () => {
    const fetchMock = stubWikidata({
      results: {
        bindings: [
          {
            hotelLabel: { value: 'Hotel Lutetia' },
            tripAdvisorId: { value: '197601' },
            adminAreaLabel: { value: 'Paris' },
            cityTAId: { value: '187147' },
            countryLabel: { value: 'France' },
            stars: { value: '5' },
            coord: { value: 'Point(2.3278 48.8515)' },
          },
        ],
      },
    });

    const hotels = await discoverHotels({
      country: 'France"@en . ?evil ?p ?o . "',
      city: 'Paris" ) . ?evil ?p ?o . "',
      limit: 1,
    });

    const query = capturedQuery(fetchMock);
    expect(query).toContain('?country rdfs:label "France\\"@en . ?evil ?p ?o . \\""@en .');
    expect(query).toContain('LCASE("Paris\\" ) . ?evil ?p ?o . \\"")');
    expect(query).not.toContain('?country rdfs:label "France"@en . ?evil');
    expect(query).toContain('LIMIT 1');

    const init = (fetchMock.mock.calls as unknown[][])[0]?.[1] as RequestInit;
    expect(init.cache).toBe('no-store');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.headers).toMatchObject({
      Accept: 'application/sparql-results+json',
      'User-Agent': 'SVBooking-HotelDiscovery/1.0 (hotel catalog expansion)',
    });

    expect(hotels).toEqual([
      expect.objectContaining({
        hotelKey: 'g187147-d197601',
        name: 'Hotel Lutetia',
        city: 'Paris',
        country: 'France',
        stars: 5,
        lat: 48.8515,
        lon: 2.3278,
      }),
    ]);
  });

  it('bounds unsafe discovery limits before they enter SPARQL', async () => {
    const fetchMock = stubWikidata({ results: { bindings: [] } });

    await discoverHotels({ limit: 99999 });
    await discoverHotels({ limit: 'not-a-number' as unknown as number });

    expect(capturedQuery(fetchMock, 0)).toContain('LIMIT 500');
    expect(capturedQuery(fetchMock, 1)).toContain('LIMIT 200');
  });

  it('deduplicates and escapes city label lookups', async () => {
    const fetchMock = stubWikidata({
      results: {
        bindings: [
          { cityLabel: { value: 'Paris' }, cityTAId: { value: '187147' } },
        ],
      },
    });

    const result = await getCityGeoIds(['Paris', 'Paris', 'Tel "Aviv', '']);
    const query = capturedQuery(fetchMock);

    expect(query.match(/"Paris"@en/g)).toHaveLength(1);
    expect(query).toContain('"Tel \\"Aviv"@en');
    expect(result).toEqual({ Paris: '187147' });
  });

  it('skips malformed discovery rows, deduplicates hotel keys, and normalizes Wikidata city labels', async () => {
    stubWikidata({
      results: {
        bindings: [
          {
            hotelLabel: { value: 'Le Meurice' },
            tripAdvisorId: { value: '188728' },
            adminAreaLabel: { value: '8th arrondissement of Paris' },
            cityTAId: { value: '187147' },
            countryLabel: { value: 'France' },
          },
          {
            hotelLabel: { value: 'Duplicate Le Meurice' },
            tripAdvisorId: { value: '188728' },
            adminAreaLabel: { value: 'Paris' },
            cityTAId: { value: '187147' },
            countryLabel: { value: 'France' },
          },
          {
            hotelLabel: { value: 'The Ritz London' },
            tripAdvisorId: { value: '187591' },
            adminAreaLabel: { value: 'City of London' },
            cityTAId: { value: '186338' },
            countryLabel: { value: 'United Kingdom' },
            coord: { value: 'not-a-point' },
          },
          {
            hotelLabel: { value: 'Wythe Hotel' },
            tripAdvisorId: { value: '1152565' },
            adminAreaLabel: { value: 'Borough of Brooklyn' },
            cityTAId: { value: '60827' },
            countryLabel: { value: 'USA' },
          },
          {
            hotelLabel: { value: 'Missing Country' },
            tripAdvisorId: { value: '1' },
            adminAreaLabel: { value: 'Paris' },
            cityTAId: { value: '187147' },
          },
          {
            hotelLabel: { value: 'Missing City Key' },
            tripAdvisorId: { value: '2' },
            adminAreaLabel: { value: 'Paris' },
            countryLabel: { value: 'France' },
          },
        ],
      },
    });

    const hotels = await discoverHotels({ limit: 20 });

    expect(hotels.map((hotel) => hotel.hotelKey)).toEqual([
      'g187147-d188728',
      'g186338-d187591',
      'g60827-d1152565',
    ]);
    expect(hotels.map((hotel) => hotel.city)).toEqual(['Paris', 'London', 'Brooklyn']);
    expect(hotels[1]).toMatchObject({ lat: null, lon: null });
  });

  it('handles empty city lookups and missing count bindings without provider fallbacks', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(getCityGeoIds([])).resolves.toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ results: { bindings: [] } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await expect(countAvailableHotels()).resolves.toBe(0);
  });

  it('surfaces failed Wikidata SPARQL responses instead of masking them', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('unavailable', {
      status: 503,
      statusText: 'Unavailable',
    })));

    await expect(countAvailableHotels()).rejects.toThrow('Wikidata SPARQL 503: Unavailable');
  });
});
