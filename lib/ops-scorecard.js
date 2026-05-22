import { HOTELS, listCities, listCountries } from './hotels-catalog';
import { buildHealthSnapshot } from './health-readiness';
import { getPwaReadiness } from './pwa-readiness';

const INVENTORY_TARGETS = {
  day30ApprovedHotels: 500,
  day60ApprovedHotels: 2000,
  day90ApprovedHotels: 10000,
  marketLeaderFloor: 50000,
};

const SCORE_TARGETS = {
  engineeringCurrent: 8.8,
  engineeringTarget: 9.5,
  competitiveCurrent: 4.8,
  freeOnlyTarget: 7,
  globalParityTarget: 9,
};

const GLOBAL_PARITY_BLOCKERS = [
  'Free-only data budget cannot match paid partner inventory, licensed reviews, OTA contracts, or Google-scale maps coverage',
  'Catalog is below global market inventory scale',
  'Licensed review and property-content provider access is not configured',
  'Native checkout, loyalty, refunds, and customer-service operations are outside the meta-search free-only scope',
];

function score(ok, partial = false) {
  if (ok) return 1;
  return partial ? 0.5 : 0;
}

function statusFromScore(value) {
  if (value >= 0.85) return 'healthy';
  if (value >= 0.5) return 'partial';
  return 'blocked';
}

function entry({ id, label, status, scoreValue, current, target, blockers = [], nextActions = [] }) {
  return {
    id,
    label,
    status,
    score: scoreValue,
    current,
    target,
    blockers,
    nextActions,
  };
}

export function buildOpsScorecard({ env = process.env, now = new Date() } = {}) {
  const health = buildHealthSnapshot({ env, now });
  const pwa = getPwaReadiness({ env });
  const checks = health.checks;
  const freeOnlyLaunchReady = Boolean(
    checks.catalog.ok &&
    checks.security.adminAuthConfigured &&
    checks.security.kindeConfigured &&
    checks.cache.durable &&
    checks.providers.available > 0 &&
    checks.providers.partnerConfigured &&
    checks.i18n.rtlSupported
  );

  const domains = [
    entry({
      id: 'production-readiness',
      label: 'Production readiness',
      status: checks.security.productionReady && checks.security.kindeConfigured && checks.cache.durable && checks.providers.partnerConfigured ? 'healthy' : 'blocked',
      scoreValue: (
        score(checks.security.productionReady) +
        score(checks.security.kindeConfigured) +
        score(checks.cache.durable) +
        score(checks.providers.partnerConfigured)
      ) / 4,
      current: {
        adminAuthConfigured: checks.security.adminAuthConfigured,
        kindeConfigured: checks.security.kindeConfigured,
        cacheMode: checks.cache.mode,
        availablePricingProviders: checks.providers.available,
        partnerPricingProviderConfigured: checks.providers.partnerConfigured,
      },
      target: {
        adminAuthConfigured: true,
        kindeConfigured: true,
        cacheMode: 'persistent',
        partnerPricingProviderConfigured: true,
      },
      blockers: [
        !checks.security.adminAuthConfigured && 'Configure ADMIN_API_SECRET or CRON_SECRET',
        !checks.security.kindeConfigured && 'Configure Kinde auth environment',
        !checks.cache.durable && 'Configure persistent Redis/KV',
        !checks.providers.partnerConfigured && 'Configure at least one complete partner pricing provider env group',
      ].filter(Boolean),
      nextActions: ['Run npm run audit:production:strict in deployment before go-live'],
    }),
    entry({
      id: 'inventory-scale',
      label: 'Inventory scale',
      status: HOTELS.length >= INVENTORY_TARGETS.day30ApprovedHotels ? 'partial' : 'blocked',
      scoreValue: Math.min(HOTELS.length / INVENTORY_TARGETS.day30ApprovedHotels, 1),
      current: {
        hotels: HOTELS.length,
        cities: listCities().length,
        countries: listCountries().length,
      },
      target: INVENTORY_TARGETS,
      blockers: HOTELS.length < INVENTORY_TARGETS.day30ApprovedHotels
        ? ['Catalog is below the 30-day approved-hotel target']
        : [],
      nextActions: [
        'Run discovery agents into /api/catalog/candidates',
        'Approve only candidates with source, provenance, location, and duplicate fingerprint',
      ],
    }),
    entry({
      id: 'reviews-and-property-content',
      label: 'Reviews and property content',
      status: checks.reviews.providerConfigured ? 'partial' : 'blocked',
      scoreValue: score(checks.reviews.providerConfigured),
      current: {
        reviewStatus: checks.reviews.status,
        propertyContentDefault: 'unavailable-without-provider',
      },
      target: {
        licensedReviews: true,
        providerBackedAmenitiesPoliciesRoomsPhotos: true,
      },
      blockers: checks.reviews.providerConfigured ? [] : ['Licensed review provider is not configured'],
      nextActions: [
        'Add licensed review provider integration',
        'Attach source, freshness, and verified flags before showing ratings or snippets',
      ],
    }),
    entry({
      id: 'mobile-retention',
      label: 'Mobile retention and alerts',
      status: pwa.push.configured && checks.alerts.deliveryConfigured ? 'healthy' : 'partial',
      scoreValue: (
        score(pwa.installable) +
        score(checks.alerts.deliveryConfigured) +
        score(pwa.push.configured)
      ) / 3,
      current: {
        pwaStatus: pwa.status,
        alertDelivery: checks.alerts.deliveryStatus,
        push: pwa.push.status,
      },
      target: {
        installablePwa: true,
        alertDelivery: 'configured',
        push: 'configured',
      },
      blockers: [
        !checks.alerts.deliveryConfigured && 'Configure PRICE_ALERT_WEBHOOK_URL and PRICE_ALERT_WEBHOOK_SECRET',
        !pwa.push.configured && 'Configure push keys and delivery worker',
      ].filter(Boolean),
      nextActions: ['Add push delivery once production notification provider is approved'],
    }),
    entry({
      id: 'localization',
      label: 'Localization',
      status: checks.i18n.contentTranslation === 'complete' ? 'healthy' : 'partial',
      scoreValue: checks.i18n.contentTranslation === 'complete' ? 1 : 0.5,
      current: {
        defaultLocale: checks.i18n.defaultLocale,
        rtlSupported: checks.i18n.rtlSupported,
        contentTranslation: checks.i18n.contentTranslation,
      },
      target: {
        fullHebrewEnglishCopy: true,
        localeAwareDatesCurrency: true,
      },
      blockers: checks.i18n.contentTranslation === 'complete' ? [] : ['Product copy translation is still partial'],
      nextActions: ['Add translation dictionaries and route-aware locale selection'],
    }),
    entry({
      id: 'observability',
      label: 'Observability',
      status: checks.opsAlerts.deliveryConfigured ? 'healthy' : 'partial',
      scoreValue: (
        score(true) +
        score(true) +
        score(checks.opsAlerts.deliveryConfigured)
      ) / 3,
      current: {
        healthEndpoint: '/api/health',
        scorecardEndpoint: '/api/ops/scorecard',
        alertsEndpoint: '/api/ops/alerts',
        alertsEvaluateEndpoint: checks.opsAlerts.evaluateEndpoint,
        alertDelivery: checks.opsAlerts.deliveryStatus,
        providerUptimeHistory: 'provider-uptime-ledger',
      },
      target: {
        sloDashboard: true,
        providerUptimeHistory: true,
        alerting: true,
      },
      blockers: checks.opsAlerts.deliveryConfigured
        ? []
        : ['Configure OPS_ALERT_WEBHOOK_URL and OPS_ALERT_WEBHOOK_SECRET for external SLO notification delivery'],
      nextActions: [
        'Review /api/ops/alerts before go-live and after provider changes',
        'Attach /api/ops/alerts/evaluate to the approved on-call webhook destination',
      ],
    }),
  ];

  const aggregate = domains.reduce((sum, domain) => sum + domain.score, 0) / domains.length;

  return {
    service: 'sv-booking',
    checkedAt: now.toISOString(),
    status: statusFromScore(aggregate),
    score: Number(aggregate.toFixed(2)),
    productTruth: {
      model: 'meta-search',
      dataBudget: 'free-only',
      globalParityReady: false,
      freeOnlyLaunchReady,
      scores: {
        engineering: {
          current: SCORE_TARGETS.engineeringCurrent,
          target: SCORE_TARGETS.engineeringTarget,
        },
        competitive: {
          current: SCORE_TARGETS.competitiveCurrent,
          freeOnlyTarget: SCORE_TARGETS.freeOnlyTarget,
          globalParityTarget: SCORE_TARGETS.globalParityTarget,
        },
      },
      globalParityBlockers: GLOBAL_PARITY_BLOCKERS,
    },
    domains,
    blockers: domains.flatMap((domain) =>
      domain.blockers.map((blocker) => ({ domain: domain.id, blocker }))
    ),
  };
}
