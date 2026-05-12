/**
 * Provider System — Multi-provider hotel pricing with automatic fallback.
 *
 * Providers are tried in priority order. If one exhausts its quota or errors out,
 * the next one is tried automatically. Quota and health tracked in-memory + KV.
 *
 * Configured providers (set env vars to enable):
 *   1. Xotelo         — free, no auth (always available)
 *   2. SerpApi        — SERPAPI_KEY (250/month free)
 *   3. Booking.com    — RAPIDAPI_KEY (500/month free)
 *   4. TripAdvisor    — RAPIDAPI_KEY (500/month free, shares key with Booking.com)
 *   5. Makcorps       — MAKCORPS_API_KEY (100/month free)
 *   6. Amadeus        — AMADEUS_CLIENT_ID + SECRET (500/month free GDS data)
 *  10. Heatmap Cache  — always available, uses cached heatmap data as last resort
 *
 * Combined free capacity: ~1,850+ requests/month + unlimited heatmap fallback
 */

import { registry } from './registry';
import { xoteloProvider } from './xotelo-provider';
import { serpapiProvider } from './serpapi-provider';
import { bookingProvider } from './booking-provider';
import { tripadvisorProvider } from './tripadvisor-provider';
import { makcorpsProvider } from './makcorps-provider';
import { amadeusProvider } from './amadeus-provider';
import { heatmapProvider } from './heatmap-provider';

// Register all providers (order = priority, lower number = higher priority)
registry.register(xoteloProvider);
registry.register(serpapiProvider);
registry.register(bookingProvider);
registry.register(tripadvisorProvider);
registry.register(makcorpsProvider);
registry.register(amadeusProvider);
registry.register(heatmapProvider);

/**
 * Fetch hotel rates from the best available provider (with automatic fallback).
 * Drop-in replacement for the old getHotelRates().
 */
export async function getHotelRates({ hotelKey, hotelName, city, checkIn, checkOut, currency = 'USD' }) {
  return registry.fetchRates({ hotelKey, hotelName, city, checkIn, checkOut, currency });
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
