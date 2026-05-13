import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/search/route';

function makeRequest(query: string): Request {
  return new Request(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}`);
}

describe('GET /api/search', () => {
  it('returns empty results for empty query', async () => {
    const res = await GET(makeRequest(''));
    const data = await res.json();
    expect(data.cities).toEqual([]);
    expect(data.hotels).toEqual([]);
  });

  it('returns matching cities for "Par"', async () => {
    const res = await GET(makeRequest('Par'));
    const data = await res.json();
    expect(data.cities).toContain('Paris');
  });

  it('returns matching hotels for "Hilton"', async () => {
    const res = await GET(makeRequest('Hilton'));
    const data = await res.json();
    expect(data.hotels.length).toBeGreaterThan(0);
    expect(data.hotels[0]).toHaveProperty('hotelKey');
    expect(data.hotels[0]).toHaveProperty('name');
    expect(data.hotels[0]).toHaveProperty('city');
    expect(data.hotels[0]).toHaveProperty('image');
  });

  it('limits cities to 5 results', async () => {
    const res = await GET(makeRequest('a')); // broad query
    const data = await res.json();
    expect(data.cities.length).toBeLessThanOrEqual(5);
  });

  it('limits hotels to 10 results', async () => {
    const res = await GET(makeRequest('hotel'));
    const data = await res.json();
    expect(data.hotels.length).toBeLessThanOrEqual(10);
  });

  it('ranks startsWith matches above includes matches', async () => {
    const res = await GET(makeRequest('Tel'));
    const data = await res.json();
    if (data.cities.length > 0) {
      // "Tel Aviv" should be first since it starts with "Tel"
      expect(data.cities[0]).toBe('Tel Aviv');
    }
  });

  it('returns countries in results', async () => {
    const res = await GET(makeRequest('France'));
    const data = await res.json();
    expect(data.countries).toBeDefined();
    expect(data.countries).toContain('France');
  });

  it('sets cache headers', async () => {
    const res = await GET(makeRequest('Paris'));
    expect(res.headers.get('Cache-Control')).toContain('s-maxage');
  });
});
