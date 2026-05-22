/**
 * Provider System — Multi-provider hotel pricing with automatic fallback.
 *
 * Providers are tried in priority order. If one exhausts its quota or errors out,
 * the next one is tried automatically. Quota and health tracked in-memory + KV.
 *
 * Provider adapters are enabled only when their required environment variables
 * are configured. Quotas and partner terms are treated as provider-owned data.
 */

import { registry } from './registry';
import { xoteloProvider } from './xotelo-provider';
import { serpapiProvider } from './serpapi-provider';
import { bookingProvider } from './booking-provider';
import { tripadvisorProvider } from './tripadvisor-provider';
import { makcorpsProvider } from './makcorps-provider';
import { amadeusProvider } from './amadeus-provider';

// Register all providers (order = priority, lower number = higher priority)
registry.register(xoteloProvider);
registry.register(serpapiProvider);
registry.register(bookingProvider);
registry.register(tripadvisorProvider);
registry.register(makcorpsProvider);
registry.register(amadeusProvider);

/**
 * Fetch hotel rates from the first configured provider that returns rates.
 * Drop-in replacement for the old getHotelRates().
 */
export async function getHotelRates({ hotelKey, hotelName, city, checkIn, checkOut, currency = 'USD', timeoutMs }) {
  return registry.fetchRates({ hotelKey, hotelName, city, checkIn, checkOut, currency, timeoutMs });
}

/**
 * Get status of all providers (quota, health, availability)
 */
export function getProviderStatus() {
  return registry.getStatus();
}

/**
 * Reset a provider's circuit breaker
 */
export function resetProvider(providerId) {
  registry.resetCircuitBreaker(providerId);
}

export { registry };
