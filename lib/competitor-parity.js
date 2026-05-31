import { HOTELS, listCities, listCountries } from './hotels-catalog';

const MARKET_TARGETS = Object.freeze({
  globalHotels: 50000,
  globalCities: 1000,
  globalCountries: 100,
  israelHotels: 150,
});

const OFFICIAL_SOURCE_URLS = Object.freeze({
  bookingApp: 'https://play.google.com/store/apps/details?hl=en-US&id=com.booking',
  bookingReviewGuidelines: 'https://www.booking.com/reviews_guidelines.en-us.html',
  googleTravel: 'https://support.google.com/travel/answer/6276008?hl=en-EN',
  googleHotelPriceTracking: 'https://blog.google/products/search/summer-travel-tips-ai-overviews-hotel-price-tracking/',
  kayakPricing: 'https://www.kayak.com/c/help/pricing/',
  kayakSearch: 'https://www.kayak.com/c/help/search/',
  hotelsCombinedAbout: 'https://www.hotelscombined.com/AboutUs',
  expediaHelp: 'https://www.expedia.com/helpcenter/?locale=en_US',
  expediaReviews: 'https://www.expedia.com/reviews',
  trivagoHome: 'https://www.trivago.com/',
  trivagoHelp: 'https://support.trivago.com/hc/en-us/sections/360000014707-How-trivago-Works',
  fattalIsrael: 'https://www.fattal.co.il/israel',
  isrotelIsrael: 'https://www.isrotel.com/',
});

const COMPETITOR_BENCHMARKS = Object.freeze([
  {
    id: 'booking',
    label: 'Booking.com',
    category: 'global-ota',
    evidenceUrls: [OFFICIAL_SOURCE_URLS.bookingApp, OFFICIAL_SOURCE_URLS.bookingReviewGuidelines],
    capabilities: [
      'inventory-breadth',
      'mobile-installability',
      'reviews-property-content',
      'booking-handoff-quality',
    ],
  },
  {
    id: 'google-travel',
    label: 'Google Travel',
    category: 'global-search',
    evidenceUrls: [OFFICIAL_SOURCE_URLS.googleTravel, OFFICIAL_SOURCE_URLS.googleHotelPriceTracking],
    capabilities: [
      'inventory-breadth',
      'price-freshness',
      'reviews-property-content',
      'alerts-retention',
      'booking-handoff-quality',
    ],
  },
  {
    id: 'kayak-hotelscombined',
    label: 'KAYAK / HotelsCombined',
    category: 'global-metasearch',
    evidenceUrls: [
      OFFICIAL_SOURCE_URLS.kayakPricing,
      OFFICIAL_SOURCE_URLS.kayakSearch,
      OFFICIAL_SOURCE_URLS.hotelsCombinedAbout,
    ],
    capabilities: [
      'inventory-breadth',
      'price-freshness',
      'mobile-installability',
      'alerts-retention',
      'booking-handoff-quality',
    ],
  },
  {
    id: 'expedia',
    label: 'Expedia',
    category: 'global-ota',
    evidenceUrls: [OFFICIAL_SOURCE_URLS.expediaHelp, OFFICIAL_SOURCE_URLS.expediaReviews],
    capabilities: [
      'inventory-breadth',
      'mobile-installability',
      'reviews-property-content',
      'booking-handoff-quality',
    ],
  },
  {
    id: 'trivago',
    label: 'trivago',
    category: 'global-metasearch',
    evidenceUrls: [OFFICIAL_SOURCE_URLS.trivagoHome, OFFICIAL_SOURCE_URLS.trivagoHelp],
    capabilities: [
      'inventory-breadth',
      'price-freshness',
      'mobile-installability',
      'alerts-retention',
      'booking-handoff-quality',
    ],
  },
  {
    id: 'fattal',
    label: 'Fattal',
    category: 'israel-chain-direct',
    evidenceUrls: [OFFICIAL_SOURCE_URLS.fattalIsrael],
    capabilities: [
      'local-market-coverage',
      'booking-handoff-quality',
    ],
  },
  {
    id: 'isrotel',
    label: 'Isrotel',
    category: 'israel-chain-direct',
    evidenceUrls: [OFFICIAL_SOURCE_URLS.isrotelIsrael],
    capabilities: [
      'local-market-coverage',
      'booking-handoff-quality',
    ],
  },
]);

function clampScore(value) {
  const numeric = Number(value);
  return Math.max(0, Math.min(1, numeric));
}

function statusFromScore(value) {
  if (value >= 0.85) return 'healthy';
  if (value >= 0.5) return 'partial';
  return 'blocked';
}

function normalizedCountry(value) {
  return String(value || '').trim().toLowerCase();
}

function ratio(current, target) {
  return clampScore(current / target);
}

function benchmarkEvidence(capabilityId) {
  return COMPETITOR_BENCHMARKS
    .filter((competitor) => competitor.capabilities.includes(capabilityId))
    .map((competitor) => ({
      competitor: competitor.id,
      label: competitor.label,
      category: competitor.category,
      evidenceUrls: competitor.evidenceUrls,
    }));
}

function capability({ id, label, scoreValue, current, target, blockers = [], nextActions = [] }) {
  const normalizedScore = clampScore(scoreValue);
  return {
    id,
    label,
    status: statusFromScore(normalizedScore),
    score: Number(normalizedScore.toFixed(2)),
    current,
    target,
    blockers,
    nextActions,
    benchmarkEvidence: benchmarkEvidence(id),
  };
}

export function buildCompetitorParity({ checks, pwa, now = new Date() } = {}) {
  const cities = listCities();
  const countries = listCountries();
  const israelHotels = HOTELS.filter((hotel) => normalizedCountry(hotel.country) === 'israel').length;
  const providerPartnerReady = Boolean(checks?.providers?.partnerConfigured);
  const providerAvailable = Number(checks?.providers?.available || 0) > 0;
  const durableCache = Boolean(checks?.cache?.durable);
  const pushConfigured = Boolean(pwa?.push?.configured || checks?.pwa?.push?.configured);
  const priceAlertDeliveryConfigured = Boolean(checks?.alerts?.deliveryConfigured);
  const priceAlertUnsubscribeConfigured = Boolean(checks?.alerts?.unsubscribeConfigured);
  const reviewsConfigured = Boolean(checks?.reviews?.providerConfigured);

  const capabilities = [
    capability({
      id: 'inventory-breadth',
      label: 'Inventory breadth',
      scoreValue: (
        ratio(HOTELS.length, MARKET_TARGETS.globalHotels) +
        ratio(cities.length, MARKET_TARGETS.globalCities) +
        ratio(countries.length, MARKET_TARGETS.globalCountries)
      ) / 3,
      current: {
        hotels: HOTELS.length,
        cities: cities.length,
        countries: countries.length,
      },
      target: {
        hotels: MARKET_TARGETS.globalHotels,
        cities: MARKET_TARGETS.globalCities,
        countries: MARKET_TARGETS.globalCountries,
      },
      blockers: HOTELS.length >= MARKET_TARGETS.globalHotels
        ? []
        : ['Catalog is below global metasearch inventory breadth'],
      nextActions: ['Scale validated catalog candidates through sourced admin approval only'],
    }),
    capability({
      id: 'price-freshness',
      label: 'Price freshness',
      scoreValue: (
        (providerAvailable ? 0.25 : 0) +
        (providerPartnerReady ? 0.45 : 0) +
        (durableCache ? 0.3 : 0)
      ),
      current: {
        availablePricingProviders: checks?.providers?.available || 0,
        partnerPricingProviderConfigured: providerPartnerReady,
        cacheMode: checks?.cache?.mode || 'unknown',
      },
      target: {
        partnerPricingProviderConfigured: true,
        cacheMode: 'persistent',
        productionFreshnessProof: true,
      },
      blockers: [
        !providerPartnerReady && 'No complete partner pricing provider env group is configured',
        !durableCache && 'Persistent KV cache is not configured',
      ].filter(Boolean),
      nextActions: ['Configure partner pricing env and measure provider-returned price freshness in production'],
    }),
    capability({
      id: 'mobile-installability',
      label: 'Mobile installability',
      scoreValue: (pwa?.installable ? 0.65 : 0) + (pushConfigured ? 0.35 : 0),
      current: {
        pwaStatus: pwa?.status || checks?.pwa?.status || 'unknown',
        push: pwa?.push?.status || checks?.pwa?.push?.status || 'unknown',
      },
      target: {
        installablePwa: true,
        pushConfigured: true,
      },
      blockers: pushConfigured ? [] : ['Push notification keys are not configured'],
      nextActions: ['Add approved push provider and verify delivery in production'],
    }),
    capability({
      id: 'reviews-property-content',
      label: 'Reviews and property content',
      scoreValue: reviewsConfigured ? 0.75 : 0,
      current: {
        reviewProviderStatus: checks?.reviews?.status || 'unavailable',
      },
      target: {
        licensedReviews: true,
        licensedPropertyContent: true,
      },
      blockers: reviewsConfigured ? [] : ['Licensed review/property-content provider is not configured'],
      nextActions: ['Integrate licensed provider before showing review copy, ratings, or rich property claims'],
    }),
    capability({
      id: 'alerts-retention',
      label: 'Alerts and retention',
      scoreValue: (
        (priceAlertDeliveryConfigured ? 0.45 : 0) +
        (priceAlertUnsubscribeConfigured ? 0.2 : 0) +
        (pushConfigured ? 0.35 : 0)
      ),
      current: {
        priceAlertDelivery: checks?.alerts?.deliveryStatus || 'not-configured',
        unsubscribe: checks?.alerts?.unsubscribeStatus || 'not-configured',
        push: pwa?.push?.status || checks?.pwa?.push?.status || 'unknown',
      },
      target: {
        deliveryConfigured: true,
        unsubscribeConfigured: true,
        pushConfigured: true,
      },
      blockers: [
        !priceAlertDeliveryConfigured && 'Price alert webhook delivery is not configured',
        !priceAlertUnsubscribeConfigured && 'Price alert unsubscribe secret is not configured',
        !pushConfigured && 'Push notification delivery is not configured',
      ].filter(Boolean),
      nextActions: ['Configure alert webhook, unsubscribe secret, and push keys with real providers'],
    }),
    capability({
      id: 'booking-handoff-quality',
      label: 'Booking handoff quality',
      scoreValue: (
        (providerAvailable ? 0.2 : 0) +
        (providerPartnerReady ? 0.45 : 0) +
        (durableCache ? 0.15 : 0)
      ),
      current: {
        handoffModel: 'provider-link-meta-search',
        nativeCheckout: false,
        partnerPricingProviderConfigured: providerPartnerReady,
      },
      target: {
        verifiedProviderDeepLinks: true,
        priceAccuracyProof: true,
        nativeCheckoutOrContractedHandoff: true,
      },
      blockers: [
        !providerPartnerReady && 'Partner provider handoff is not configured',
        'Native checkout, loyalty, refunds, and customer-service operations are outside the current meta-search scope',
      ],
      nextActions: ['Add contracted provider handoff proof and price-accuracy monitoring before claiming booking parity'],
    }),
    capability({
      id: 'local-market-coverage',
      label: 'Israel local market coverage',
      scoreValue: ratio(israelHotels, MARKET_TARGETS.israelHotels),
      current: {
        israelHotels,
      },
      target: {
        israelHotels: MARKET_TARGETS.israelHotels,
        directChainParity: ['fattal', 'isrotel'],
      },
      blockers: israelHotels >= MARKET_TARGETS.israelHotels
        ? []
        : ['Israel catalog coverage is below the local direct-chain parity target'],
      nextActions: ['Prioritize sourced Israeli hotel candidates before local-market parity claims'],
    }),
  ];

  const scoreValue = capabilities.reduce((sum, item) => sum + item.score, 0) / capabilities.length;
  const blockers = capabilities.flatMap((item) =>
    item.blockers.map((blocker) => ({ capability: item.id, blocker }))
  );

  return {
    checkedAt: now.toISOString(),
    status: statusFromScore(scoreValue),
    score: Number(scoreValue.toFixed(2)),
    sourcePolicy: 'official-or-platform-owned-public-pages-only',
    lastReviewedAt: '2026-05-31',
    targets: MARKET_TARGETS,
    competitors: COMPETITOR_BENCHMARKS,
    capabilities,
    blockers,
    nextActions: [
      'Run weekly source review for competitor capability changes',
      'Treat missing licensed/provider evidence as a blocker, not an unknown-to-green default',
    ],
  };
}
