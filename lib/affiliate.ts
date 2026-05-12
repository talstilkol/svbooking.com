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
}

const PROVIDER_CONFIGS: Record<string, AffiliateConfig> = {
  'Booking.com': { envVar: 'BOOKING_AFFILIATE_ID', paramName: 'aid' },
  'Expedia': { envVar: 'EXPEDIA_AFFILIATE_ID', paramName: 'affcid' },
  'Hotels.com': { envVar: 'HOTELS_AFFILIATE_TAG', paramName: 'tag' },
  'Agoda.com': { envVar: 'AGODA_AFFILIATE_ID', paramName: 'cid' },
  'Trip.com': { envVar: 'TRIP_AFFILIATE_ID', paramName: 'Allianceid' },
  'Vio.com': { envVar: 'VIO_AFFILIATE_ID', paramName: 'affid' },
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
    url.searchParams.set(config.paramName, affiliateId);
    // Add a consistent sub-tracking parameter
    url.searchParams.set('utm_source', 'svbooking');
    url.searchParams.set('utm_medium', 'referral');
    return url.toString();
  } catch {
    // If URL parsing fails, append params manually
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${config.paramName}=${encodeURIComponent(affiliateId)}&utm_source=svbooking&utm_medium=referral`;
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
