import { afterEach, describe, expect, it, vi } from 'vitest';
import { discoverHotels, getCityGeoIds } from '@/lib/wikidata';

function stubWikidata(payload: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function capturedQuery(fetchMock: ReturnType<typeof stubWikidata>, callIndex = 0) {
  const input = fetchMock.mock.calls[callIndex]?.[0];
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

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
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
});
