import { HOTELS, listCities, listCountries } from './hotels-catalog';
import { getProviderStatus } from './providers/index';
import { isPriceAlertDeliveryConfigured } from './price-alert-delivery';
import { isPriceAlertUnsubscribeConfigured } from './price-alert-unsubscribe';
import { isReviewProviderConfigured } from './reviews';
import { getI18nReadiness } from './i18n';
import { getPwaReadiness } from './pwa-readiness';
import { getDataRetentionReadiness } from './data-retention';
import { getUserDataPrivacyReadiness } from './user-data';
import { isOpsAlertDeliveryConfigured } from './ops-alert-delivery';
import { getConfiguredPartnerProviderIds, isEnvConfigured, isKindeConfigured } from './env-config.mjs';

const MIN_HOTELS = 500;
const MIN_CITIES = 100;
const MIN_COUNTRIES = 60;

function isAdminAuthConfigured(env) {
  return isEnvConfigured(env, 'ADMIN_API_SECRET') || isEnvConfigured(env, 'CRON_SECRET');
}

function isPersistentCacheConfigured(env) {
  return Boolean(
    (isEnvConfigured(env, 'UPSTASH_REDIS_REST_URL') && isEnvConfigured(env, 'UPSTASH_REDIS_REST_TOKEN')) ||
    (isEnvConfigured(env, 'KV_REST_API_URL') && isEnvConfigured(env, 'KV_REST_API_TOKEN'))
  );
}

export function buildHealthSnapshot({ now = new Date(), env = process.env } = {}) {
  const cities = listCities();
  const countries = listCountries();
  const providers = getProviderStatus();
  const configuredProviders = providers.filter((provider) => provider.configured);
  const availableProviders = providers.filter((provider) => provider.available);
  const configuredPartnerProviders = getConfiguredPartnerProviderIds(env);

  const catalog = {
    ok: HOTELS.length >= MIN_HOTELS && cities.length >= MIN_CITIES && countries.length >= MIN_COUNTRIES,
    hotels: HOTELS.length,
    cities: cities.length,
    countries: countries.length,
    minimums: {
      hotels: MIN_HOTELS,
      cities: MIN_CITIES,
      countries: MIN_COUNTRIES,
    },
  };

  const providerSummary = {
    ok: availableProviders.length > 0,
    total: providers.length,
    configured: configuredProviders.length,
    available: availableProviders.length,
    partnerConfigured: configuredPartnerProviders.length > 0,
    configuredPartnerProviders,
    unavailable: providers.length - availableProviders.length,
    degraded: providers.filter((provider) => provider.configured && !provider.available).length,
  };

  const security = {
    adminAuthConfigured: isAdminAuthConfigured(env),
    kindeConfigured: isKindeConfigured(env),
    productionReady: env.NODE_ENV !== 'production' || (isAdminAuthConfigured(env) && isKindeConfigured(env)),
  };

  const cache = {
    durable: isPersistentCacheConfigured(env),
    mode: isPersistentCacheConfigured(env) ? 'persistent' : 'memory',
  };

  const agents = {
    freshness: 'admin-status-endpoint',
    readinessEndpoint: '/api/agents/auto/status',
  };

  const alerts = {
    storage: cache.durable ? 'persistent' : 'memory',
    evaluator: 'configured',
    deliveryConfigured: isPriceAlertDeliveryConfigured(env),
    deliveryStatus: isPriceAlertDeliveryConfigured(env) ? 'configured' : 'not-configured',
    unsubscribeConfigured: isPriceAlertUnsubscribeConfigured(env),
    unsubscribeStatus: isPriceAlertUnsubscribeConfigured(env) ? 'configured' : 'not-configured',
  };

  const opsAlerts = {
    evaluator: 'configured',
    deliveryConfigured: isOpsAlertDeliveryConfigured(env),
    deliveryStatus: isOpsAlertDeliveryConfigured(env) ? 'configured' : 'not-configured',
    endpoint: '/api/ops/alerts',
    evaluateEndpoint: '/api/ops/alerts/evaluate',
  };

  const reviews = {
    providerConfigured: isReviewProviderConfigured(env),
    status: isReviewProviderConfigured(env) ? 'configured' : 'unavailable',
  };

  const i18n = getI18nReadiness();
  const pwa = getPwaReadiness({ env });
  const retention = getDataRetentionReadiness();
  const privacy = getUserDataPrivacyReadiness();

  const warnings = [];
  if (!catalog.ok) warnings.push('Catalog is below required coverage floor');
  if (!providerSummary.ok) warnings.push('No pricing providers are currently available');
  if (!security.adminAuthConfigured) warnings.push('Admin bearer auth secret is not configured');
  if (!security.kindeConfigured) warnings.push('Kinde auth environment is not configured');
  if (!cache.durable) warnings.push('Persistent KV cache is not configured');

  const ready = catalog.ok && providerSummary.ok && security.productionReady;
  const freeOnlyLaunchReady = Boolean(
    catalog.ok &&
    providerSummary.ok &&
    providerSummary.partnerConfigured &&
    security.adminAuthConfigured &&
    security.kindeConfigured &&
    cache.durable &&
    i18n.rtlSupported &&
    pwa.installable
  );

  return {
    service: 'sv-booking',
    status: ready ? (warnings.length > 0 ? 'degraded' : 'healthy') : 'error',
    ready,
    checkedAt: now.toISOString(),
    launchReadiness: {
      model: 'meta-search',
      dataBudget: 'free-only',
      freeOnlyLaunchReady,
      globalParityReady: false,
      blockers: [
        !catalog.ok && 'Catalog is below required coverage floor',
        !providerSummary.ok && 'No verified pricing provider is available',
        !providerSummary.partnerConfigured && 'No complete partner pricing provider env group is configured',
        !security.adminAuthConfigured && 'Admin or cron bearer auth is not configured',
        !security.kindeConfigured && 'Kinde auth environment is not configured',
        !cache.durable && 'Persistent KV cache is not configured',
        !i18n.rtlSupported && 'RTL locale support is unavailable',
        !pwa.installable && 'PWA installability is unavailable',
        'Global parity remains blocked without paid inventory, licensed reviews, OTA contracts, and production operations',
      ].filter(Boolean),
    },
    checks: {
      catalog,
      providers: providerSummary,
      security,
      cache,
      agents,
      alerts,
      opsAlerts,
      reviews,
      i18n,
      pwa,
      retention,
      privacy,
    },
    warnings,
  };
}
