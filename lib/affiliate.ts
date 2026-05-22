/**
 * Affiliate URL builder — injects provider-specific tracking parameters.
 *
 * Each provider has its own affiliate program:
 * - Booking.com: ?aid=BOOKING_AFFILIATE_ID
 * - Expedia: ?affcid=EXPEDIA_AFFILIATE_ID
 * - Hotels.com: ?tag=HOTELS_AFFILIATE_TAG
 * - Agoda: ?cid=AGODA_AFFILIATE_ID
 * - Trip.com: ?Allianceid=TRIP_AFFILIATE_ID
 *
 * If no affiliate ID is configured for a provider, the URL is returned unchanged.
 * All env vars are optional — the system works with zero config.
 */

interface AffiliateConfig {
  envVar: string;
  paramName: string;
  domains: string[];
}

const PROVIDER_CONFIGS: Record<string, AffiliateConfig> = {
  'Booking.com': { envVar: 'BOOKING_AFFILIATE_ID', paramName: 'aid', domains: ['booking.com'] },
  'Expedia': { envVar: 'EXPEDIA_AFFILIATE_ID', paramName: 'affcid', domains: ['expedia.com'] },
  'Hotels.com': { envVar: 'HOTELS_AFFILIATE_TAG', paramName: 'tag', domains: ['hotels.com'] },
  'Agoda.com': { envVar: 'AGODA_AFFILIATE_ID', paramName: 'cid', domains: ['agoda.com'] },
  'Trip.com': { envVar: 'TRIP_AFFILIATE_ID', paramName: 'Allianceid', domains: ['trip.com'] },
  'Vio.com': { envVar: 'VIO_AFFILIATE_ID', paramName: 'affid', domains: ['vio.com'] },
};

/**
 * Inject affiliate tracking parameters into a booking URL.
 * Returns the URL unchanged if no affiliate ID is configured for the provider.
 */
export function getAffiliateUrl(provider: string, baseUrl: string): string {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) return baseUrl;

  const affiliateId = process.env[config.envVar];
  if (!affiliateId) return baseUrl;

  try {
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:') return baseUrl;
    url.searchParams.set(config.paramName, affiliateId);
    // Add a consistent sub-tracking parameter
    url.searchParams.set('utm_source', 'svbooking');
    url.searchParams.set('utm_medium', 'referral');
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export function isKnownProvider(provider: string): boolean {
  return Boolean(PROVIDER_CONFIGS[provider]);
}

export function isAllowedProviderUrl(provider: string, baseUrl: string): boolean {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) return false;

  try {
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    return config.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

/**
 * Check if any affiliate IDs are configured.
 */
export function hasAffiliateConfig(): boolean {
  return Object.values(PROVIDER_CONFIGS).some(
    (config) => !!process.env[config.envVar]
  );
}

/**
 * Get list of configured affiliate providers.
 */
export function getConfiguredProviders(): string[] {
  return Object.entries(PROVIDER_CONFIGS)
    .filter(([, config]) => !!process.env[config.envVar])
    .map(([provider]) => provider);
}
