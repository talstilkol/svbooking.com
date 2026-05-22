import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/providers/index', () => ({
  getProviderStatus: vi.fn(() => []),
  resetProvider: vi.fn(),
}));

vi.mock('@/lib/hotels-catalog', () => ({
  HOTELS: [
    { hotelKey: 'g1-d1', name: 'Verified Hotel', city: 'Paris', country: 'France' },
  ],
  addAndPersistHotel: vi.fn(() => true),
  findHotel: vi.fn(() => null),
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
      del: vi.fn(async (key: string) => {
        store.delete(key);
      }),
      keys: vi.fn(async (pattern: string) => {
        if (pattern === 'discovered:hotels:*') return [];
        return [...store.keys()].filter((key) => key.startsWith(pattern.replace('*', '')));
      }),
      mget: vi.fn(async (keys: string[]) => keys.map((key) => store.get(key) || null)),
      isConfigured: vi.fn(async () => false),
    },
  };
});

vi.mock('@/lib/xotelo', () => ({
  getRates: vi.fn(async () => ({ rates: [{ rate: 100, tax: 20 }] })),
  getHeatmap: vi.fn(async () => ({ rates: [] })),
}));

vi.mock('@/lib/wikidata', () => ({
  discoverHotels: vi.fn(async () => []),
}));

vi.mock('@/lib/overpass', () => ({
  discoverHotels: vi.fn(async () => []),
  countHotels: vi.fn(async () => 0),
}));

vi.mock('@/lib/nominatim', () => ({
  searchHotels: vi.fn(async () => []),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({
    check: vi.fn(async () => ({ success: true, reset: Date.now() + 60000 })),
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn((reset: number) =>
    Response.json({ error: 'Rate limit exceeded', reset }, { status: 429 })
  ),
}));

vi.mock('@/lib/admin-audit', () => ({
  recordAdminAuditEvent: vi.fn(async () => ({ id: 'audit-event' })),
}));

vi.mock('@/lib/agent-utils', () => ({
  AGENT_NAMES: {
    PROVIDER_MANAGER: 'provider-manager',
    HEALTH_MONITOR: 'health-monitor',
    ENRICHMENT: 'enrichment',
    DISCOVERY: 'discovery',
    BULK_DISCOVERY: 'bulk-discovery',
    OSM_SCANNER: 'osm-scanner',
    XOTELO_DISCOVERY: 'xotelo-discovery',
    PRICE_CACHE: 'price-cache',
    DEAL_SCANNER: 'deal-scanner',
    POI_CACHE: 'poi-cache',
    TRAVEL_GUIDE: 'travel-guide',
    EVENTS_CACHE: 'events-cache',
    ORCHESTRATOR: 'orchestrator',
  },
  getAllAgentStatuses: vi.fn(async () => ({
    orchestrator: { status: 'never-run' },
  })),
  getAllAgentReadiness: vi.fn(async () => ({
    orchestrator: { status: 'blocked', ready: false, missingConfig: ['CRON_SECRET'] },
  })),
  getAgentHistory: vi.fn(async () => []),
}));

import { addAndPersistHotel } from '@/lib/hotels-catalog';
import { recordAdminAuditEvent } from '@/lib/admin-audit';
import { resetProvider } from '@/lib/providers/index';
import { getRates } from '@/lib/xotelo';
import { POST as validateCatalog } from '@/app/api/catalog/validate/route';
import { GET as discoverCatalog } from '@/app/api/catalog/discover/route';
import { GET as discoverCatalogOsm } from '@/app/api/catalog/discover-osm/route';
import { GET as getDiscovered, POST as addDiscovered } from '@/app/api/agents/discovered/route';
import { GET as getProviders, POST as resetProviderStatus } from '@/app/api/agents/providers/route';
import { GET as getAgentHealth } from '@/app/api/agents/health-check/route';
import { GET as getAgentStatus } from '@/app/api/agents/auto/status/route';

function makeGetRequest(path: string, token?: string): Request {
  return new Request(`http://localhost:3000${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

function makePostRequest(
  path: string,
  body: Record<string, unknown>,
  token?: string,
  extraHeaders: Record<string, string> = {}
): Request {
  return new Request(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

describe('admin mutation auth', () => {
  beforeEach(async () => {
    const mod = await import('@/lib/kv') as Record<string, unknown>;
    (mod.__store as Map<string, unknown>).clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('fails closed when no admin secret is configured', async () => {
    vi.stubEnv('ADMIN_API_SECRET', '');
    vi.stubEnv('CRON_SECRET', '');

    const res = await resetProviderStatus(
      makePostRequest('/api/agents/providers', { action: 'reset', providerId: 'xotelo' })
    );
    expect(res.status).toBe(403);
  });

  it('rejects missing bearer token when admin secret exists', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const res = await resetProviderStatus(
      makePostRequest('/api/agents/providers', { action: 'reset', providerId: 'xotelo' })
    );
    expect(res.status).toBe(401);
  });

  it('rejects unknown provider IDs even with valid admin auth', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const res = await resetProviderStatus(
      makePostRequest(
        '/api/agents/providers',
        { action: 'reset', providerId: 'unknown-provider' },
        'admin-test-secret'
      )
    );
    expect(res.status).toBe(400);
    expect(resetProvider).not.toHaveBeenCalled();
  });

  it('accepts valid admin auth for known provider reset', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const res = await resetProviderStatus(
      makePostRequest('/api/agents/providers', { action: 'reset', providerId: 'xotelo' }, 'admin-test-secret')
    );
    expect(res.status).toBe(200);
    expect(resetProvider).toHaveBeenCalledWith('xotelo');
    expect(recordAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'provider.reset',
        actor: 'admin-api-secret',
        resource: 'xotelo',
      })
    );
  });

  it('rejects cross-origin admin provider reset mutations', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const res = await resetProviderStatus(
      makePostRequest(
        '/api/agents/providers',
        { action: 'reset', providerId: 'xotelo' },
        'admin-test-secret',
        { origin: 'https://evil.example' }
      )
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(body.error).toBe('Same-origin request required');
    expect(resetProvider).not.toHaveBeenCalled();
  });

  it('protects discovered candidate mutation endpoints and requires approval for promotion', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const denied = await addDiscovered(
      makePostRequest('/api/agents/discovered', {
        hotelKey: 'verified-hotel-key',
        name: 'Verified Hotel',
        city: 'Paris',
        country: 'France',
      })
    );
    expect(denied.status).toBe(401);

    const accepted = await addDiscovered(
      makePostRequest(
        '/api/agents/discovered',
        {
          action: 'ingest',
          hotelKey: 'verified-hotel-key',
          name: 'Verified Hotel',
          city: 'Paris',
          country: 'France',
          source: 'manual-admin',
          sourceUrl: 'https://www.wikidata.org/wiki/Q90',
          lat: 48.8566,
          lon: 2.3522,
          externalIds: { wikidataId: 'Q90' },
        },
        'admin-test-secret'
      )
    );
    expect(accepted.status).toBe(200);
    const body = await accepted.json();
    expect(body.queued).toBe(true);
    expect(body.candidate.status).toBe('pending');
    expect(addAndPersistHotel).not.toHaveBeenCalled();
    expect(recordAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'catalog.candidates.ingest',
        actor: 'admin-api-secret',
        resource: body.candidate.id,
      })
    );

    const approved = await addDiscovered(
      makePostRequest(
        '/api/agents/discovered',
        { action: 'approve', id: body.candidate.id },
        'admin-test-secret'
      )
    );
    expect(approved.status).toBe(200);
    expect(addAndPersistHotel).toHaveBeenCalledWith({
      hotelKey: 'verified-hotel-key',
      name: 'Verified Hotel',
      city: 'Paris',
      country: 'France',
      stars: 0,
      lat: 48.8566,
      lon: 2.3522,
      source: 'manual-admin',
      sourceUrl: 'https://www.wikidata.org/wiki/Q90',
      externalIds: { wikidataId: 'Q90' },
      provenance: expect.objectContaining({
        source: 'manual-admin',
        sourceUrl: 'https://www.wikidata.org/wiki/Q90',
      }),
    });
  });

  it('rejects cross-origin discovered candidate mutations', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const res = await addDiscovered(
      makePostRequest(
        '/api/agents/discovered',
        { action: 'approve', id: 'g297930-d305178' },
        'admin-test-secret',
        { origin: 'https://evil.example' }
      )
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(body.error).toBe('Same-origin request required');
    expect(addAndPersistHotel).not.toHaveBeenCalled();
  });

  it('fails catalog validation closed when no admin secret is configured', async () => {
    vi.stubEnv('ADMIN_API_SECRET', '');
    vi.stubEnv('CRON_SECRET', '');

    const res = await validateCatalog(
      makePostRequest('/api/catalog/validate', {
        hotels: [{ hotelKey: 'verified-hotel-key', name: 'Verified Hotel' }],
      })
    );
    expect(res.status).toBe(403);
    expect(getRates).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated catalog validation before provider calls', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const res = await validateCatalog(
      makePostRequest('/api/catalog/validate', {
        hotels: [{ hotelKey: 'verified-hotel-key', name: 'Verified Hotel' }],
      })
    );
    expect(res.status).toBe(401);
    expect(getRates).not.toHaveBeenCalled();
  });

  it('accepts valid admin auth for catalog validation', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const res = await validateCatalog(
      makePostRequest(
        '/api/catalog/validate',
        {
          hotels: [{ hotelKey: 'verified-hotel-key', name: 'Verified Hotel' }],
        },
        'admin-test-secret'
      )
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.valid).toBe(1);
    expect(getRates).toHaveBeenCalledWith(
      expect.objectContaining({ hotelKey: 'verified-hotel-key', timeoutMs: 10000 })
    );
    expect(recordAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'catalog.validate',
        actor: 'admin-api-secret',
        resource: 'catalog',
      })
    );
  });

  it('rejects cross-origin catalog validation mutations before provider calls', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const res = await validateCatalog(
      makePostRequest(
        '/api/catalog/validate',
        {
          hotels: [{ hotelKey: 'g297930-d305178', name: 'Patong Beach Hotel' }],
        },
        'admin-test-secret',
        { origin: 'https://evil.example' }
      )
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(body.error).toBe('Same-origin request required');
    expect(getRates).not.toHaveBeenCalled();
  });

  it('protects operational provider status reads', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const denied = await getProviders(makeGetRequest('/api/agents/providers'));
    expect(denied.status).toBe(401);
    expect(denied.headers.get('cache-control')).toBe('no-store');

    const accepted = await getProviders(makeGetRequest('/api/agents/providers', 'admin-test-secret'));
    expect(accepted.status).toBe(200);
    expect(accepted.headers.get('cache-control')).toBe('no-store');
  });

  it('protects discovered catalog reads', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const denied = await getDiscovered(makeGetRequest('/api/agents/discovered?stats=true'));
    expect(denied.status).toBe(401);

    const accepted = await getDiscovered(makeGetRequest('/api/agents/discovered?stats=true', 'admin-test-secret'));
    expect(accepted.status).toBe(200);
    expect(accepted.headers.get('cache-control')).toBe('no-store');
  });

  it('protects expensive agent health probes before provider calls', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const denied = await getAgentHealth(makeGetRequest('/api/agents/health-check'));
    expect(denied.status).toBe(401);

    const accepted = await getAgentHealth(makeGetRequest('/api/agents/health-check', 'admin-test-secret'));
    expect(accepted.status).toBe(200);
    expect(accepted.headers.get('cache-control')).toBe('no-store');
  });

  it('protects background agent status reads', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const denied = await getAgentStatus(makeGetRequest('/api/agents/auto/status'));
    expect(denied.status).toBe(401);

    const accepted = await getAgentStatus(makeGetRequest('/api/agents/auto/status', 'admin-test-secret'));
    expect(accepted.status).toBe(200);
    expect(accepted.headers.get('cache-control')).toBe('no-store');
  });

  it('protects catalog discovery reads', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const denied = await discoverCatalog(makeGetRequest('/api/catalog/discover?city=Paris'));
    expect(denied.status).toBe(401);

    const accepted = await discoverCatalog(makeGetRequest('/api/catalog/discover?city=Paris', 'admin-test-secret'));
    expect(accepted.status).toBe(200);
    expect(accepted.headers.get('cache-control')).toBe('no-store');
  });

  it('protects OSM catalog discovery reads', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const denied = await discoverCatalogOsm(makeGetRequest('/api/catalog/discover-osm?city=Paris'));
    expect(denied.status).toBe(401);

    const accepted = await discoverCatalogOsm(
      makeGetRequest('/api/catalog/discover-osm?city=Paris&source=count', 'admin-test-secret')
    );
    expect(accepted.status).toBe(200);
    expect(accepted.headers.get('cache-control')).toBe('no-store');
  });
});
