import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCompetitorParity } from '@/lib/competitor-parity';

const baseChecks = {
  providers: {
    available: 0,
    partnerConfigured: false,
  },
  cache: {
    durable: false,
    mode: 'memory',
  },
  alerts: {
    deliveryConfigured: false,
    deliveryStatus: 'not-configured',
    unsubscribeConfigured: false,
    unsubscribeStatus: 'not-configured',
  },
  reviews: {
    providerConfigured: false,
    status: 'unavailable',
  },
  pwa: {
    status: 'installable-offline-shell',
    push: {
      configured: false,
      status: 'not-configured',
    },
  },
};

const pushReadyPwa = {
  status: 'push-ready',
  installable: true,
  push: {
    configured: true,
    status: 'keys-configured',
  },
};

describe('competitor parity tracker', () => {
  afterEach(() => {
    vi.doUnmock('@/lib/hotels-catalog');
    vi.resetModules();
  });

  it('falls back to unavailable current values when readiness input is absent', () => {
    const parity = buildCompetitorParity({ now: new Date('2026-05-31T12:00:00.000Z') });
    const byId = new Map(parity.capabilities.map((capability) => [capability.id, capability]));

    expect(byId.get('price-freshness')).toMatchObject({
      current: {
        availablePricingProviders: 0,
        partnerPricingProviderConfigured: false,
        cacheMode: 'unknown',
      },
    });
    expect(byId.get('mobile-installability')).toMatchObject({
      status: 'blocked',
      current: {
        pwaStatus: 'unknown',
        push: 'unknown',
      },
    });
    expect(byId.get('alerts-retention')).toMatchObject({
      current: {
        priceAlertDelivery: 'not-configured',
        unsubscribe: 'not-configured',
        push: 'unknown',
      },
    });
  });

  it('tracks competitor capabilities from sourced public pages without marking missing evidence as ready', () => {
    const parity = buildCompetitorParity({
      checks: baseChecks,
      pwa: {
        installable: true,
        push: {
          configured: false,
          status: 'not-configured',
        },
      },
      now: new Date('2026-05-31T12:00:00.000Z'),
    });
    const byId = new Map(parity.capabilities.map((capability) => [capability.id, capability]));

    expect(parity).toMatchObject({
      checkedAt: '2026-05-31T12:00:00.000Z',
      status: 'blocked',
      sourcePolicy: 'official-or-platform-owned-public-pages-only',
      lastReviewedAt: '2026-05-31',
    });
    expect(parity.competitors.map((competitor) => competitor.id)).toEqual([
      'booking',
      'google-travel',
      'kayak-hotelscombined',
      'expedia',
      'trivago',
      'fattal',
      'isrotel',
    ]);
    expect(byId.get('price-freshness')).toMatchObject({
      status: 'blocked',
      blockers: expect.arrayContaining([
        'No complete partner pricing provider env group is configured',
        'Persistent KV cache is not configured',
      ]),
    });
    expect(byId.get('reviews-property-content')).toMatchObject({
      status: 'blocked',
      blockers: ['Licensed review/property-content provider is not configured'],
    });
    expect(byId.get('alerts-retention')?.benchmarkEvidence.map((entry) => entry.competitor)).toEqual([
      'google-travel',
      'kayak-hotelscombined',
      'trivago',
    ]);
  });

  it('improves configured capabilities while keeping global parity blocked by scale and handoff gaps', () => {
    const parity = buildCompetitorParity({
      checks: {
        ...baseChecks,
        providers: {
          available: 2,
          partnerConfigured: true,
        },
        cache: {
          durable: true,
          mode: 'persistent',
        },
        alerts: {
          deliveryConfigured: true,
          deliveryStatus: 'configured',
          unsubscribeConfigured: true,
          unsubscribeStatus: 'configured',
        },
        reviews: {
          providerConfigured: true,
          status: 'configured',
        },
      },
      pwa: pushReadyPwa,
      now: new Date('2026-05-31T12:00:00.000Z'),
    });
    const byId = new Map(parity.capabilities.map((capability) => [capability.id, capability]));

    expect(byId.get('price-freshness')).toMatchObject({ status: 'healthy', score: 1, blockers: [] });
    expect(byId.get('mobile-installability')).toMatchObject({ status: 'healthy', score: 1, blockers: [] });
    expect(byId.get('alerts-retention')).toMatchObject({ status: 'healthy', score: 1, blockers: [] });
    expect(byId.get('inventory-breadth')?.status).toBe('blocked');
    expect(byId.get('booking-handoff-quality')).toMatchObject({
      status: 'partial',
      blockers: expect.arrayContaining([
        'Native checkout, loyalty, refunds, and customer-service operations are outside the current meta-search scope',
      ]),
    });
    expect(parity.blockers.map((entry) => entry.capability)).toEqual(expect.arrayContaining([
      'inventory-breadth',
      'booking-handoff-quality',
    ]));
  });

  it('marks inventory and Israel coverage healthy only when sourced catalog scale reaches the parity target', async () => {
    vi.doMock('@/lib/hotels-catalog', () => ({
      HOTELS: Array.from({ length: 50050 }, (_value, index) => ({
        hotelKey: `g1-d${index + 1}`,
        name: 'unknown/unavailable',
        city: 'unknown/unavailable',
        country: index === 0 ? '' : 'Israel',
      })),
      listCities: () => Array.from({ length: 1000 }, () => 'unknown/unavailable'),
      listCountries: () => Array.from({ length: 100 }, () => 'unknown/unavailable'),
    }));
    vi.resetModules();
    const { buildCompetitorParity: buildWithLargeCatalog } = await import('@/lib/competitor-parity');
    const parity = buildWithLargeCatalog({
      checks: baseChecks,
      pwa: pushReadyPwa,
      now: new Date('2026-05-31T12:00:00.000Z'),
    });
    const byId = new Map(parity.capabilities.map((capability) => [capability.id, capability]));

    expect(byId.get('inventory-breadth')).toMatchObject({
      status: 'healthy',
      blockers: [],
    });
    expect(byId.get('local-market-coverage')).toMatchObject({
      status: 'healthy',
      current: { israelHotels: 50049 },
      blockers: [],
    });
  });
});
