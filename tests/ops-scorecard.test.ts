import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildOpsScorecard } from '@/lib/ops-scorecard';
import { buildCatalogMediaQuality } from '@/lib/catalog-media-quality';
import { GET as getOpsScorecard } from '@/app/api/ops/scorecard/route';

describe('ops scorecard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('summarizes competitive blockers without leaking secret values', () => {
    const scorecard = buildOpsScorecard({
      env: {
        ADMIN_API_SECRET: 'admin-secret-value',
        PRICE_ALERT_WEBHOOK_SECRET: 'webhook-secret-value',
      } as unknown as NodeJS.ProcessEnv,
      now: new Date('2026-05-14T12:00:00.000Z'),
    });

    expect(scorecard.service).toBe('sv-booking');
    expect(scorecard.checkedAt).toBe('2026-05-14T12:00:00.000Z');
    expect(scorecard.productTruth.model).toBe('meta-search');
    expect(scorecard.productTruth.dataBudget).toBe('free-only');
    expect(scorecard.productTruth.globalParityReady).toBe(false);
    expect(scorecard.productTruth.globalParityBlockers.length).toBeGreaterThan(0);
    expect(scorecard.productTruth.scores.engineering.current).toBe(8.8);
    expect(scorecard.productTruth.scores.competitive.current).toBe(4.8);
    expect(scorecard.domains.map((domain) => domain.id)).toEqual(
      expect.arrayContaining([
        'production-readiness',
        'inventory-scale',
        'catalog-media-quality',
        'reviews-and-property-content',
        'mobile-retention',
        'localization',
        'observability',
        'competitor-parity',
      ])
    );
    expect(scorecard.productTruth.competitorParity.status).toBe('blocked');
    expect(scorecard.productTruth.competitorParity.sourcePolicy).toBe('official-or-platform-owned-public-pages-only');
    expect(scorecard.productTruth.catalogMediaQuality.status).toBe('partial');
    expect(scorecard.blockers.length).toBeGreaterThan(0);
    expect(JSON.stringify(scorecard)).not.toContain('admin-secret-value');
    expect(JSON.stringify(scorecard)).not.toContain('webhook-secret-value');
  });

  it('separates free-only launch readiness from global parity claims', () => {
    const scorecard = buildOpsScorecard({
      env: {
        ADMIN_API_SECRET: 'admin-secret-value',
        UPSTASH_REDIS_REST_URL: 'https://redis.svbooking.com',
        UPSTASH_REDIS_REST_TOKEN: 'svbooking-redis-token-scorecard-0001',
        KINDE_CLIENT_ID: 'svbooking-kinde-client-id-0001',
        KINDE_CLIENT_SECRET: 'svbooking-kinde-client-secret-0001',
        KINDE_ISSUER_URL: 'https://auth.svbooking.com',
        KINDE_SITE_URL: 'https://svbooking.com',
        KINDE_POST_LOGOUT_REDIRECT_URL: 'https://svbooking.com',
        KINDE_POST_LOGIN_REDIRECT_URL: 'https://svbooking.com/dashboard',
        SERPAPI_KEY: 'svbooking-serpapi-key-scorecard-0001',
      } as unknown as NodeJS.ProcessEnv,
      now: new Date('2026-05-14T12:00:00.000Z'),
    });

    expect(scorecard.productTruth.freeOnlyLaunchReady).toBe(true);
    expect(scorecard.productTruth.globalParityReady).toBe(false);
    expect(JSON.stringify(scorecard)).not.toContain('svbooking-kinde-client-secret-0001');
    expect(JSON.stringify(scorecard)).not.toContain('svbooking-serpapi-key-scorecard-0001');
    expect(JSON.stringify(scorecard)).not.toContain('svbooking-redis-token-scorecard-0001');
  });

  it('blocks production readiness without Kinde and a complete partner provider group', () => {
    const scorecard = buildOpsScorecard({
      env: {
        ADMIN_API_SECRET: 'admin-secret-value',
        UPSTASH_REDIS_REST_URL: 'https://redis.svbooking.com',
        UPSTASH_REDIS_REST_TOKEN: 'svbooking-redis-token-scorecard-0001',
      } as unknown as NodeJS.ProcessEnv,
      now: new Date('2026-05-14T12:00:00.000Z'),
    });
    const production = scorecard.domains.find((domain) => domain.id === 'production-readiness');

    expect(production?.status).toBe('blocked');
    expect(production?.current.kindeConfigured).toBe(false);
    expect(production?.current.partnerPricingProviderConfigured).toBe(false);
    expect(production?.blockers).toContain('Configure Kinde auth environment');
    expect(production?.blockers).toContain('Configure at least one complete partner pricing provider env group');
  });

  it('marks observability healthy only when ops alert delivery is configured', () => {
    const scorecard = buildOpsScorecard({
      env: {
        ADMIN_API_SECRET: 'admin-secret-value',
        OPS_ALERT_WEBHOOK_URL: 'https://ops.svbooking.invalid/hook',
        OPS_ALERT_WEBHOOK_SECRET: 'ops-webhook-secret',
      } as unknown as NodeJS.ProcessEnv,
      now: new Date('2026-05-14T12:00:00.000Z'),
    });
    const observability = scorecard.domains.find((domain) => domain.id === 'observability');

    expect(observability?.status).toBe('healthy');
    expect(observability?.current.alertDelivery).toBe('configured');
    expect(observability?.blockers).toEqual([]);
    expect(JSON.stringify(scorecard)).not.toContain('ops-webhook-secret');
    expect(JSON.stringify(scorecard)).not.toContain('ops.svbooking.invalid');
  });

  it('marks configured production, reviews, mobile alerts, and observability domains without global parity claims', () => {
    const scorecard = buildOpsScorecard({
      env: {
        NODE_ENV: 'production',
        ADMIN_API_SECRET: 'admin-secret-value',
        CRON_SECRET: 'cron-secret-value',
        UPSTASH_REDIS_REST_URL: 'https://redis.svbooking.com',
        UPSTASH_REDIS_REST_TOKEN: 'svbooking-redis-token-scorecard-0001',
        KINDE_CLIENT_ID: 'svbooking-kinde-client-id-0001',
        KINDE_CLIENT_SECRET: 'svbooking-kinde-client-secret-0001',
        KINDE_ISSUER_URL: 'https://auth.svbooking.com',
        KINDE_SITE_URL: 'https://svbooking.com',
        KINDE_POST_LOGOUT_REDIRECT_URL: 'https://svbooking.com',
        KINDE_POST_LOGIN_REDIRECT_URL: 'https://svbooking.com/dashboard',
        SERPAPI_KEY: 'svbooking-serpapi-key-scorecard-0001',
        REVIEWS_PROVIDER_NAME: 'google-places',
        REVIEWS_PROVIDER_LICENSED: 'true',
        PRICE_ALERT_WEBHOOK_URL: 'https://alerts.svbooking.invalid/hook',
        PRICE_ALERT_WEBHOOK_SECRET: 'price-alert-secret',
        NEXT_PUBLIC_PUSH_PUBLIC_KEY: 'push-public-key',
        PUSH_PRIVATE_KEY: 'push-private-key',
        OPS_ALERT_WEBHOOK_URL: 'https://ops.svbooking.invalid/hook',
        OPS_ALERT_WEBHOOK_SECRET: 'ops-alert-secret',
      } as unknown as NodeJS.ProcessEnv,
      now: new Date('2026-05-14T12:00:00.000Z'),
    });

    const byId = new Map(scorecard.domains.map((domain) => [domain.id, domain]));

    expect(byId.get('production-readiness')?.status).toBe('healthy');
    expect(byId.get('reviews-and-property-content')?.status).toBe('partial');
    expect(byId.get('reviews-and-property-content')?.blockers).toEqual([]);
    expect(byId.get('mobile-retention')?.status).toBe('healthy');
    expect(byId.get('observability')?.status).toBe('healthy');
    expect(scorecard.productTruth.freeOnlyLaunchReady).toBe(true);
    expect(scorecard.productTruth.globalParityReady).toBe(false);
    expect(scorecard.productTruth.competitorParity.blockers.length).toBeGreaterThan(0);
    expect(JSON.stringify(scorecard)).not.toContain('cron-secret-value');
    expect(JSON.stringify(scorecard)).not.toContain('price-alert-secret');
    expect(JSON.stringify(scorecard)).not.toContain('push-private-key');
    expect(JSON.stringify(scorecard)).not.toContain('ops-alert-secret');
  });

  it('surfaces reused catalog media as a scorecard blocker instead of hiding audit warnings', () => {
    const mediaQuality = buildCatalogMediaQuality();

    expect(mediaQuality.status).toBe('partial');
    expect(mediaQuality.current.reusedImages).toBeGreaterThan(0);
    expect(mediaQuality.current.unapprovedImageSources).toBeGreaterThan(0);
    expect(mediaQuality.blockers.some((blocker) => blocker.includes('Catalog image reused across'))).toBe(true);
    expect(mediaQuality.blockers.some((blocker) => blocker.includes('require approved license metadata or replacement'))).toBe(true);
    expect(mediaQuality.target.licensedImageSourceMetadata).toBe(true);
  });

  it('blocks missing or invalid catalog media without inventing replacement images', () => {
    const mediaQuality = buildCatalogMediaQuality({
      hotels: [
        {
          image: '',
        },
        {
          hotelKey: 'unknown/unavailable',
          city: 'unknown/unavailable',
          image: 'unknown/unavailable',
        },
      ],
    });

    expect(mediaQuality.status).toBe('blocked');
    expect(mediaQuality.score).toBe(0);
    expect(mediaQuality.blockers).toEqual([
      'unknown/unavailable: missing catalog image',
      'unknown/unavailable: invalid catalog image URL',
    ]);
  });

  it('keeps catalog media partial until image license metadata is approved even when reuse is below the review threshold', () => {
    const mediaQuality = buildCatalogMediaQuality({ maxReuseCities: 10 });

    expect(mediaQuality.status).toBe('partial');
    expect(mediaQuality.current.reusedImages).toBe(0);
    expect(mediaQuality.current.unapprovedImageSources).toBeGreaterThan(0);
    expect(mediaQuality.blockers).toEqual([
      `${mediaQuality.current.unapprovedImageSources} catalog image sources require approved license metadata or replacement`,
    ]);
  });

  it('marks catalog media healthy only when image source metadata and license approval are present', () => {
    const image = 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80';
    const mediaQuality = buildCatalogMediaQuality({
      hotels: [{
        hotelKey: 'g1-d1',
        name: 'Licensed Media Hotel',
        city: 'Paris',
        image,
      }],
      provenanceLedger: [{
        image: {
          status: 'source-metadata-available',
          source: 'approved-media-library',
          sourceHost: 'images.unsplash.com',
          sourceUrl: image,
          licenseStatus: 'approved',
          approvedLicense: true,
          replacementRequired: false,
        },
      }],
    } as Parameters<typeof buildCatalogMediaQuality>[0]);

    expect(mediaQuality.status).toBe('healthy');
    expect(mediaQuality.score).toBe(1);
    expect(mediaQuality.current.missingImageSourceMetadata).toBe(0);
    expect(mediaQuality.current.unapprovedImageSources).toBe(0);
    expect(mediaQuality.blockers).toEqual([]);
  });

  it('keeps valid images partial when source metadata is missing and handles malformed hotel inputs', () => {
    const image = 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80';
    const missingMetadata = buildCatalogMediaQuality({
      hotels: [{
        hotelKey: 'g1-d1',
        city: 'Paris',
        image,
      }],
      provenanceLedger: [{ image: { status: 'missing-image-source-url' } }],
    } as Parameters<typeof buildCatalogMediaQuality>[0]);
    const malformed = buildCatalogMediaQuality({
      hotels: null,
    } as Parameters<typeof buildCatalogMediaQuality>[0]);

    expect(missingMetadata.status).toBe('partial');
    expect(missingMetadata.current.missingImageSourceMetadata).toBe(1);
    expect(missingMetadata.blockers).toEqual([
      '1 catalog images are missing source or license-status metadata',
    ]);
    expect(malformed.status).toBe('blocked');
    expect(malformed.current.hotels).toBe(0);
  });

  it('blocks an empty catalog media set instead of creating replacement media', () => {
    const mediaQuality = buildCatalogMediaQuality({ hotels: [] });

    expect(mediaQuality.status).toBe('blocked');
    expect(mediaQuality.score).toBe(0);
    expect(mediaQuality.blockers).toEqual(['No catalog hotels available for media quality scoring']);
  });

  it('tracks non-HTTPS media and missing sizing parameters as review findings', () => {
    const mediaQuality = buildCatalogMediaQuality({
      hotels: [
        {
          name: 'unknown/unavailable',
          city: 'unknown/unavailable',
          image: 'http://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80',
        },
        {
          city: 'unknown/unavailable',
          image: 'https://images.unsplash.com/photo-1560969184-10fe8719e047',
        },
      ],
    });

    expect(mediaQuality.status).toBe('blocked');
    expect(mediaQuality.current.imagesWithoutSizing).toBe(1);
    expect(mediaQuality.blockers).toEqual([
      'unknown/unavailable: catalog image URL is not HTTPS',
      '2 catalog image sources require approved license metadata or replacement',
    ]);
  });

  it('treats non-string catalog media as missing and normalizes blank cities without fabricated labels', () => {
    const image = 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80';
    const mediaQuality = buildCatalogMediaQuality({
      hotels: [
        {
          hotelKey: 'unknown/unavailable',
          name: 'unknown/unavailable',
          city: 'unknown/unavailable',
          image: null,
        },
        {
          hotelKey: 'unknown/unavailable',
          name: 'unknown/unavailable',
          city: '',
          image,
        },
        {
          hotelKey: 'unknown/unavailable',
          name: 'unknown/unavailable',
          city: '   ',
          image,
        },
        {
          hotelKey: 'unknown/unavailable',
          name: 'unknown/unavailable',
          city: 'Tel Aviv',
          image,
        },
      ],
      maxReuseCities: 1,
    } as Parameters<typeof buildCatalogMediaQuality>[0]);

    expect(mediaQuality.status).toBe('blocked');
    expect(mediaQuality.reusedImages).toEqual([
      {
        image,
        cityCount: 2,
        cities: ['Tel Aviv', 'unknown/unavailable'],
      },
    ]);
    expect(mediaQuality.blockers).toEqual([
      'unknown/unavailable: missing catalog image',
      `Catalog image reused across 2 cities: ${image}`,
      '1 catalog image sources require approved license metadata or replacement',
    ]);
  });

  it('protects the scorecard route with admin bearer auth and no-store caching', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-scorecard-secret');

    const denied = await getOpsScorecard(new Request('http://localhost:3000/api/ops/scorecard'));
    expect(denied!.status).toBe(401);
    expect(denied!.headers.get('cache-control')).toBe('no-store');

    const accepted = await getOpsScorecard(new Request('http://localhost:3000/api/ops/scorecard', {
      headers: { Authorization: 'Bearer admin-scorecard-secret' },
    }));
    const body = await accepted!.json();

    expect(accepted!.status).toBe(200);
    expect(accepted!.headers.get('cache-control')).toBe('no-store');
    expect(body.domains.some((domain: { id: string }) => domain.id === 'inventory-scale')).toBe(true);
    expect(JSON.stringify(body)).not.toContain('admin-scorecard-secret');
  });
});
