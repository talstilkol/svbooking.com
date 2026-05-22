import { findHotel } from './hotels-catalog';

export function isReviewProviderConfigured(env = process.env) {
  return Boolean(env.REVIEWS_PROVIDER_NAME && env.REVIEWS_PROVIDER_LICENSED === 'true');
}

export function getUnavailableReviewSummary(hotelKey) {
  const hotel = findHotel(hotelKey);
  if (!hotel) return null;

  return {
    hotelKey,
    hotelName: hotel.name,
    available: false,
    status: 'unavailable',
    source: null,
    verified: false,
    count: null,
    rating: null,
    lastUpdatedAt: null,
    reviews: [],
    reason: 'No licensed review provider is configured for this property.',
  };
}
