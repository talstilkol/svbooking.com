import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hotels-catalog', () => ({
  findHotel: vi.fn((hotelKey: string) => (
    hotelKey === 'existing-hotel'
      ? { hotelKey, name: 'Existing Hotel', city: 'Paris', country: 'France' }
      : null
  )),
  addAndPersistHotel: vi.fn(async () => true),
  getCatalogStats: vi.fn(() => ({ total: 133 })),
}));

vi.mock('@/lib/kv', () => {
  const store = new Map<string, unknown>();
  return {
    __store: store,
    kv: {
      get: vi.fn(async (key: string) => store.get(key) || null),
      setWithTTL: vi.fn(async (key: string, value: unknown) => {
        store.set(key, value);
      }),
      mget: vi.fn(async (keys: string[]) => keys.map((key) => store.get(key) || null)),
      keys: vi.fn(async () => []),
      del: vi.fn(async (key: string) => {
        store.delete(key);
      }),
      isConfigured: vi.fn(async () => false),
    },
  };
});

vi.mock('@/lib/admin-audit', () => ({
  recordAdminAuditEvent: vi.fn(async () => ({ id: 'audit-event' })),
}));

import { GET, POST } from '@/app/api/catalog/candidates/route';
import { addAndPersistHotel } from '@/lib/hotels-catalog';

function request(
  path: string,
  token?: string,
  body?: Record<string, unknown>,
  extraHeaders: Record<string, string> = {}
) {
  return new Request(`http://localhost:3000${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('/api/catalog/candidates', () => {
  beforeEach(async () => {
    const mod = await import('@/lib/kv') as Record<string, unknown>;
    (mod.__store as Map<string, unknown>).clear();
    vi.clearAllMocks();
    vi.stubEnv('ADMIN_API_SECRET', 'admin-candidate-secret');
    vi.stubEnv('CRON_SECRET', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires admin auth and returns no-store', async () => {
    const denied = await GET(request('/api/catalog/candidates'));
    expect(denied!.status).toBe(401);
    expect(denied!.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects cross-origin catalog candidate mutations', async () => {
    const response = await POST(request(
      '/api/catalog/candidates',
      'admin-candidate-secret',
      { action: 'approve', id: 'g297930-d305178' },
      { origin: 'https://evil.example' }
    ));
    const body = await response!.json();

    expect(response!.status).toBe(403);
    expect(response!.headers.get('cache-control')).toBe('no-store');
    expect(body.error).toBe('Same-origin request required');
    expect(addAndPersistHotel).not.toHaveBeenCalled();
  });

  it('ingests candidates without promoting, then filters missing provenance and stale state', async () => {
    const ingested = await POST(request('/api/catalog/candidates', 'admin-candidate-secret', {
      action: 'ingest',
      hotelKey: 'new-hotel',
      name: 'New Hotel',
      city: 'Paris',
      country: 'France',
      source: 'unknown',
    }));
    const body = await ingested!.json();

    expect(ingested!.status).toBe(200);
    expect(body.candidate.status).toBe('pending');
    expect(body.candidate.missingProvenance).toBe(true);
    expect(addAndPersistHotel).not.toHaveBeenCalled();

    const missing = await GET(request('/api/catalog/candidates?missingProvenance=true', 'admin-candidate-secret'));
    const missingBody = await missing!.json();
    expect(missingBody.total).toBe(1);

    const stale = await POST(request('/api/catalog/candidates', 'admin-candidate-secret', {
      action: 'stale',
      id: body.candidate.id,
      reason: 'source unavailable',
    }));
    const staleBody = await stale!.json();
    expect(stale!.status).toBe(200);
    expect(staleBody.candidate.status).toBe('stale');
  });

  it('marks existing catalog candidates as duplicate', async () => {
    await POST(request('/api/catalog/candidates', 'admin-candidate-secret', {
      hotelKey: 'existing-hotel',
      name: 'Existing Hotel',
      city: 'Paris',
      country: 'France',
      source: 'wikidata',
      wikidataId: 'Q1',
    }));

    const response = await GET(request('/api/catalog/candidates?duplicate=true', 'admin-candidate-secret'));
    const body = await response!.json();

    expect(response!.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.candidates[0].duplicate).toBe(true);
  });
});
