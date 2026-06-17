import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const store = new Map<string, unknown>();
  return {
    store,
    setWithTTL: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  };
});

vi.mock('@/lib/agent-utils', () => ({
  AGENT_NAMES: { ENRICHMENT: 'enrichment' },
  runAgent: vi.fn(async (_name: string, fn: () => Promise<unknown>) => ({
    status: 'completed',
    result: await fn(),
  })),
  sleep: vi.fn(async () => undefined),
  verifyCronAuth: vi.fn(() => ({ authorized: true })),
}));

vi.mock('@/lib/wikipedia', () => ({
  getSummary: vi.fn(async () => null),
}));

vi.mock('@/lib/wikidata-enrich', () => ({
  enrichFromWikidata: vi.fn(async () => new Map([
    ['301497', { bookingSlug: 'fr/hotel-lutetia' }],
  ])),
}));

vi.mock('@/lib/dbpedia', () => ({
  discoverHotelsDBpedia: vi.fn(async () => []),
}));

vi.mock('@/lib/hotels-catalog', () => ({
  HOTELS: [
    { hotelKey: 'g293984-d301497', name: 'Hotel Lutetia', city: 'Paris', country: 'France' },
  ],
  listCities: vi.fn(() => ['Paris']),
}));

vi.mock('@/lib/kv', () => ({
  __store: mocks.store,
  kv: {
    get: vi.fn(async (key: string) => mocks.store.get(key) || null),
    setWithTTL: mocks.setWithTTL,
  },
}));

import { enrichFromWikidata } from '@/lib/wikidata-enrich';
import { kv } from '@/lib/kv';
import { GET } from '@/app/api/agents/auto/enrichment/route';

afterEach(() => {
  mocks.store.clear();
  vi.clearAllMocks();
});

describe('enrichment agent', () => {
  it('persists booking slugs returned as a Wikidata enrichment Map', async () => {
    const res = await GET(new Request('http://localhost:3000/api/agents/auto/enrichment'));
    const body = await res!.json();

    expect(res!.status).toBe(200);
    expect(enrichFromWikidata).toHaveBeenCalledWith(['301497']);
    expect(body.result.bookingLinksFound).toBe(1);
    expect(kv.setWithTTL).toHaveBeenCalledWith(
      'enrichment:booking:d301497',
      expect.objectContaining({
        bookingSlug: 'fr/hotel-lutetia',
        wikidataId: null,
      }),
      2592000
    );
  });
});
