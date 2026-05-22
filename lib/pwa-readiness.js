export function isPushConfigured(env = process.env) {
  return Boolean(env.NEXT_PUBLIC_PUSH_PUBLIC_KEY && env.PUSH_PRIVATE_KEY);
}

export function getPwaReadiness({ env = process.env } = {}) {
  const pushConfigured = isPushConfigured(env);

  return {
    status: pushConfigured ? 'push-ready' : 'installable-offline-shell',
    installable: true,
    manifest: {
      route: '/manifest.webmanifest',
      icons: ['/icon-192.png', '/icon-512.png'],
      display: 'standalone',
    },
    serviceWorker: {
      path: '/sw.js',
      registeredInProductionOnly: true,
      offlineFallback: '/offline',
      apiCachingPolicy: 'network-only',
      pushHandler: true,
    },
    offline: {
      savedTrips: 'local-device',
      favorites: 'local-device',
      livePrices: 'network-required',
    },
    push: {
      configured: pushConfigured,
      status: pushConfigured ? 'keys-configured' : 'not-configured',
      requiresUserPermission: true,
      delivery: pushConfigured ? 'service-worker-handler-ready' : 'disabled-without-keys',
    },
    gaps: pushConfigured
      ? []
      : ['Push notification keys are not configured; price-alert retention is webhook/account-only until push delivery is added.'],
  };
}
