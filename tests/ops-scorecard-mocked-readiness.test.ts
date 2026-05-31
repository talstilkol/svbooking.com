import { afterEach, describe, expect, it, vi } from 'vitest';

describe('ops scorecard constrained readiness states', () => {
  type MockHotel = { hotelKey?: string; image?: string };

  afterEach(() => {
    vi.doUnmock('@/lib/hotels-catalog');
    vi.doUnmock('@/lib/providers/index');
    vi.doUnmock('@/lib/i18n');
    vi.doUnmock('@/lib/pwa-readiness');
    vi.resetModules();
  });

  it('surfaces undersized catalog, missing auth, and complete localization states honestly', async () => {
    vi.doMock('@/lib/hotels-catalog', () => ({
      HOTELS: Array.from({ length: 12 }, (_value, index) => ({
        hotelKey: `g1-d${index + 1}`,
        name: `Catalog Hotel ${index + 1}`,
        city: 'Paris',
        country: 'France',
      })),
      listCities: () => ['Paris'],
      listCountries: () => ['France'],
      buildStaticCatalogProvenanceLedger: ({ hotels = [] }: { hotels?: MockHotel[] } = {}) => hotels.map((hotel) => ({
        hotelKey: hotel.hotelKey || null,
        catalogItem: {
          status: hotel.hotelKey ? 'source-metadata-available' : 'missing-source-key',
          source: 'tripadvisor-xotelo-key',
          sourceUrl: null,
          sourceUrlStatus: 'not-stored',
          externalIds: {},
          dataPolicy: 'identity-only-no-review-price-or-availability-claims',
        },
        image: {
          status: hotel.image ? 'source-metadata-available' : 'missing-image-source-url',
          source: hotel.image ? 'unsplash-image-url' : null,
          sourceHost: hotel.image ? 'images.unsplash.com' : null,
          sourceUrl: hotel.image || null,
          licenseStatus: hotel.image ? 'requires-approved-license-metadata' : 'missing',
          approvedLicense: false,
          replacementRequired: true,
        },
      })),
    }));
    vi.doMock('@/lib/providers/index', () => ({
      getProviderStatus: () => [{
        id: 'xotelo',
        name: 'Xotelo',
        configured: false,
        available: false,
      }],
    }));
    vi.doMock('@/lib/i18n', () => ({
      getI18nReadiness: () => ({
        status: 'available',
        defaultLocale: 'en',
        supportedLocales: ['en', 'he'],
        rtlSupported: true,
        contentTranslation: 'complete',
      }),
    }));
    vi.doMock('@/lib/pwa-readiness', () => ({
      getPwaReadiness: () => ({
        status: 'installable',
        installable: true,
        push: {
          configured: false,
          status: 'not-configured',
        },
      }),
    }));

    vi.resetModules();
    const { buildHealthSnapshot } = await import('@/lib/health-readiness');
    const { buildOpsScorecard } = await import('@/lib/ops-scorecard');
    const now = new Date('2026-05-31T08:00:00.000Z');
    const health = buildHealthSnapshot({ env: {} as unknown as NodeJS.ProcessEnv, now });
    const scorecard = buildOpsScorecard({ env: {} as unknown as NodeJS.ProcessEnv, now });
    const domains = new Map(scorecard.domains.map((domain: { id: string }) => [domain.id, domain]));

    expect(health.warnings).toEqual(expect.arrayContaining([
      'Catalog is below required coverage floor',
      'No pricing providers are currently available',
      'Admin bearer auth secret is not configured',
      'Persistent KV cache is not configured',
    ]));
    expect(domains.get('production-readiness')).toMatchObject({
      status: 'blocked',
      blockers: expect.arrayContaining(['Configure ADMIN_API_SECRET or CRON_SECRET']),
    });
    expect(domains.get('inventory-scale')).toMatchObject({
      status: 'blocked',
      blockers: ['Catalog is below the 30-day approved-hotel target'],
    });
    expect(domains.get('localization')).toMatchObject({
      status: 'healthy',
      score: 1,
      blockers: [],
    });
  });
});
