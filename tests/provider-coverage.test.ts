import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn(async (key: string) => store.get(key) || null),
  },
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: vi.fn((request: Request) => {
    if (request.headers.get('authorization') === 'Bearer admin-secret') {
      return { authorized: true, subject: 'admin' };
    }
    return {
      authorized: false,
      response: Response.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }),
}));

import { GET } from '@/app/api/agents/providers/coverage/route';
import { getProviderCoverageMatrix } from '@/lib/provider-coverage';

describe('provider coverage telemetry', () => {
  beforeEach(() => {
    store.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports insufficient data without fabricating provider coverage', async () => {
    const coverage = await getProviderCoverageMatrix({ days: 0 });

    expect(coverage).toMatchObject({
      status: 'insufficient-data',
      dataPolicy: 'verified-provider-observations-only',
      days: 7,
      totalObservations: 0,
      byProvider: [],
      byCountry: [],
      byCity: [],
    });
    expect(coverage.catalogScope.observedCities).toBe(0);
    expect(coverage.catalogScope.unobservedCities).toBeGreaterThan(0);
  });

  it('groups verified price observations by date, provider, city, and country', async () => {
    store.set('price:observations:2026-05-31', [
      {
        hotelKey: 'g187147-d188728',
        provider: 'Booking.com',
        quotedTotal: 520,
        currency: 'USD',
      },
      {
        hotelKey: 'g186338-d193089',
        provider: 'Expedia',
        quotedTotal: 420,
        currency: 'GBP',
      },
      {
        hotelKey: 'not-in-catalog',
        provider: '',
        quotedTotal: 100,
        currency: 'USD',
      },
    ]);

    const coverage = await getProviderCoverageMatrix({ days: 1 });

    expect(coverage.status).toBe('available');
    expect(coverage.totalObservations).toBe(3);
    expect(coverage.byDate).toEqual([
      expect.objectContaining({
        date: '2026-05-31',
        observations: 3,
        providerCount: 3,
        cityCount: 3,
        countryCount: 3,
      }),
    ]);
    expect(coverage.byProvider).toEqual([
      expect.objectContaining({ key: 'Booking.com', observations: 1, cities: ['Paris'], countries: ['France'] }),
      expect.objectContaining({ key: 'Expedia', observations: 1, cities: ['London'], countries: ['United Kingdom'] }),
      expect.objectContaining({ key: 'unknown', observations: 1, cities: ['unknown'], countries: ['unknown'] }),
    ]);
    expect(coverage.byCountry).toEqual(expect.arrayContaining([
      expect.objectContaining({ country: 'France', observations: 1, providers: ['Booking.com'] }),
      expect.objectContaining({ country: 'United Kingdom', observations: 1, providers: ['Expedia'] }),
    ]));
  });

  it('protects provider coverage behind admin auth and no-store', async () => {
    const denied = await GET(new Request('http://localhost:3000/api/agents/providers/coverage'));
    expect(denied!.status).toBe(401);
    expect(denied!.headers.get('Cache-Control')).toBe('no-store');

    const accepted = await GET(new Request('http://localhost:3000/api/agents/providers/coverage?days=60', {
      headers: { Authorization: 'Bearer admin-secret' },
    }));
    const body = await accepted!.json();

    expect(accepted!.status).toBe(200);
    expect(accepted!.headers.get('Cache-Control')).toBe('no-store');
    expect(body.coverage.days).toBe(30);
    expect(body.coverage.status).toBe('insufficient-data');
  });
});
