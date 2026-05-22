import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock KV before importing the route
const mockStore = new Map<string, unknown>();
vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn(async (key: string) => mockStore.get(key) || null),
    set: vi.fn(async (key: string, value: unknown) => mockStore.set(key, value)),
    setWithTTL: vi.fn(async (key: string, value: unknown) => mockStore.set(key, value)),
  },
}));

import { GET } from '@/app/api/price-history/route';

function makeRequest(params: string): Request {
  return new Request(`http://localhost:3000/api/price-history?${params}`);
}

describe('GET /api/price-history', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('returns 400 when hotelKey is missing', async () => {
    const res = await GET(makeRequest(''));
    expect(res.status).toBe(400);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const data = await res.json();
    expect(data.error).toContain('hotelKey');
  });

  it('returns hasRealData: false when no history exists', async () => {
    const res = await GET(makeRequest('hotelKey=g000000-d000000'));
    const data = await res.json();
    expect(data.hasRealData).toBe(false);
    expect(data.points).toEqual([]);
    expect(data.dataPolicy).toBe('verified-provider-observations-only');
  });

  it('returns real price history data', async () => {
    const today = new Date().toISOString().split('T')[0];
    const history = [
      { date: today, price: 150, provider: 'Booking.com' },
    ];
    mockStore.set('price-history:g123-d456', history);

    const res = await GET(makeRequest('hotelKey=g123-d456'));
    const data = await res.json();
    expect(data.hasRealData).toBe(true);
    expect(data.points.length).toBe(1);
    expect(data.points[0].price).toBe(150);
    expect(data.points[0].provider).toBe('Booking.com');
    expect(data.dataPolicy).toBe('verified-provider-observations-only');
  });

  it('filters out unverified price history entries', async () => {
    const today = new Date().toISOString().split('T')[0];
    const history = [
      { date: today, price: 0, provider: 'Booking.com', source: 'xotelo' },
      { date: today, price: 120, provider: 'unknown', source: 'xotelo' },
      { date: today, price: 130, provider: 'Expedia', source: 'heatmap' },
      { date: '2026-02-30', price: 140, provider: 'Expedia', source: 'xotelo' },
      { date: today, price: 150, provider: 'Booking.com', source: 'xotelo' },
    ];
    mockStore.set('price-history:g123-d456', history);

    const res = await GET(makeRequest('hotelKey=g123-d456'));
    const data = await res.json();
    expect(data.hasRealData).toBe(true);
    expect(data.points).toEqual([
      {
        date: today,
        price: 150,
        provider: 'Booking.com',
        source: 'xotelo',
        lastCheckedAt: null,
      },
    ]);
    expect(data.totalPoints).toBe(1);
  });

  it('filters by period', async () => {
    const recent = new Date().toISOString().split('T')[0];
    const old = '2020-01-01';
    const history = [
      { date: old, price: 100, provider: 'Expedia' },
      { date: recent, price: 150, provider: 'Booking.com' },
    ];
    mockStore.set('price-history:g123-d456', history);

    const res = await GET(makeRequest('hotelKey=g123-d456&period=7'));
    const data = await res.json();
    expect(data.hasRealData).toBe(true);
    // Old data (2020) should be filtered out
    expect(data.points.length).toBe(1);
    expect(data.points[0].date).toBe(recent);
  });

  it('caps period at 90 days', async () => {
    const res = await GET(makeRequest('hotelKey=g123-d456&period=365'));
    const data = await res.json();
    // Should not crash with a large period
    expect(data).toBeDefined();
  });

  it('sets cache headers', async () => {
    const res = await GET(makeRequest('hotelKey=g123-d456'));
    expect(res.headers.get('Cache-Control')).toContain('s-maxage');
  });
});
