import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hotels-catalog', () => ({
  HOTELS: Array.from({ length: 500 }, (_value, index) => ({ id: `g187147-d${100000 + index}` })),
  listCities: () => Array.from({ length: 100 }, (_value, index) => `city-${index}`),
  listCountries: () => Array.from({ length: 60 }, (_value, index) => `country-${index}`),
}));

vi.mock('@/lib/providers/index', () => ({
  getProviderStatus: () => [
    { id: 'serpapi', configured: true, available: true },
  ],
}));

vi.mock('@/lib/price-alert-delivery', () => ({
  isPriceAlertDeliveryConfigured: () => false,
}));

vi.mock('@/lib/price-alert-unsubscribe', () => ({
  isPriceAlertUnsubscribeConfigured: () => false,
}));

vi.mock('@/lib/reviews', () => ({
  isReviewProviderConfigured: () => false,
}));

vi.mock('@/lib/i18n', () => ({
  getI18nReadiness: () => ({
    defaultLocale: 'en',
    supportedLocales: [{ code: 'en', dir: 'ltr' }],
    rtlSupported: false,
    contentTranslation: 'partial',
    fallbackPolicy: 'English fallback for unavailable strings',
    dictionaries: { en: 1 },
  }),
}));

vi.mock('@/lib/pwa-readiness', () => ({
  getPwaReadiness: () => ({
    installable: false,
    push: { status: 'not-configured' },
  }),
}));

vi.mock('@/lib/data-retention', () => ({
  getDataRetentionReadiness: () => ({ status: 'defined' }),
}));

vi.mock('@/lib/user-data', () => ({
  getUserDataPrivacyReadiness: () => ({ status: 'available' }),
}));

vi.mock('@/lib/ops-alert-delivery', () => ({
  isOpsAlertDeliveryConfigured: () => false,
}));

vi.mock('@/lib/env-config.mjs', () => ({
  getConfiguredPartnerProviderIds: () => ['serpapi'],
  isEnvConfigured: (env: Record<string, string | undefined>, name: string) => Boolean(env[name]),
  isKindeConfigured: (env: Record<string, string | undefined>) => Boolean(
    env.KINDE_CLIENT_ID &&
    env.KINDE_CLIENT_SECRET &&
    env.KINDE_ISSUER_URL &&
    env.KINDE_SITE_URL &&
    env.KINDE_POST_LOGOUT_REDIRECT_URL &&
    env.KINDE_POST_LOGIN_REDIRECT_URL
  ),
  normalizedEnvValue: (env: Record<string, string | undefined>, name: string) => String(env[name] || '').trim(),
}));

import { buildHealthSnapshot } from '@/lib/health-readiness';

const healthyCatalogMediaQuality = {
  status: 'healthy',
  score: 1,
  current: {
    hotels: 1,
    uniqueImages: 1,
    reusedImages: 0,
    imagesWithoutSizing: 0,
    missingImageSourceMetadata: 0,
    unapprovedImageSources: 0,
    maxReuseCities: 2,
  },
  target: {
    missingImages: 0,
    invalidImages: 0,
    nonHttpsImages: 0,
    reusedImages: 0,
    imagesWithoutSizing: 0,
    maxReuseCitiesPerImage: 2,
    licensedImageSourceMetadata: true,
  },
  blockers: [],
  nextActions: [],
};

describe('health readiness edge cases', () => {
  it('keeps launch blocked when catalog, providers, auth, cache, and partner env are ready but RTL/PWA are not', () => {
    const env = {
      ADMIN_API_SECRET: 'svbooking-admin-secret-health-0001',
      CRON_SECRET: 'svbooking-cron-secret-health-0001',
      UPSTASH_REDIS_REST_URL: 'https://redis.svbooking.com',
      UPSTASH_REDIS_REST_TOKEN: 'svbooking-redis-token-health-0001',
      KINDE_CLIENT_ID: 'svbooking-kinde-client-id-0001',
      KINDE_CLIENT_SECRET: 'svbooking-kinde-client-secret-0001',
      KINDE_ISSUER_URL: 'https://auth.svbooking.com',
      KINDE_SITE_URL: 'https://svbooking.com',
      KINDE_POST_LOGOUT_REDIRECT_URL: 'https://svbooking.com',
      KINDE_POST_LOGIN_REDIRECT_URL: 'https://svbooking.com/dashboard',
      SERPAPI_KEY: 'svbooking-serpapi-key-health-0001',
      REVIEWS_PROVIDER_NAME: 'google-places',
      REVIEWS_PROVIDER_LICENSED: 'true',
      GOOGLE_PLACES_API_KEY: 'svbooking-google-places-health-0001',
      PRICE_ALERT_WEBHOOK_URL: 'https://alerts.svbooking.com/hook',
      PRICE_ALERT_WEBHOOK_SECRET: 'svbooking-alert-secret-health-0001',
      PRICE_ALERT_UNSUBSCRIBE_SECRET: 'svbooking-unsubscribe-health-0001',
      OPS_ALERT_WEBHOOK_URL: 'https://ops.svbooking.com/hook',
      OPS_ALERT_WEBHOOK_SECRET: 'svbooking-ops-secret-health-0001',
      NEXT_PUBLIC_PUSH_PUBLIC_KEY: 'svbooking-public-push-health-0001',
      PUSH_PRIVATE_KEY: 'svbooking-private-push-health-0001',
    };

    const snapshot = buildHealthSnapshot({
      env,
      now: new Date('2026-05-31T12:00:00.000Z'),
      catalogMediaQuality: healthyCatalogMediaQuality,
    });

    expect(snapshot.ready).toBe(true);
    expect(snapshot.launchReadiness.freeOnlyLaunchReady).toBe(false);
    expect(snapshot.launchReadiness.blockers).toEqual(expect.arrayContaining([
      'RTL locale support is unavailable',
      'PWA installability is unavailable',
      'Global parity remains blocked without paid inventory, licensed reviews, OTA contracts, and production operations',
    ]));
    expect(snapshot.checks.i18n.rtlSupported).toBe(false);
    expect(snapshot.checks.pwa.installable).toBe(false);
  });
});
