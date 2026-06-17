import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hotels-catalog', () => ({
  findHotel: vi.fn((hotelKey: string) => (
    hotelKey === 'g1-d1'
      ? { hotelKey, name: 'Verified Hotel', city: 'Paris', country: 'France' }
      : null
  )),
}));

vi.mock('@/lib/reviews/google-places', () => ({
  fetchGooglePlacesReviews: vi.fn(),
}));

import { GET as getReviews } from '@/app/api/reviews/[hotelKey]/route';
import { GET as getPropertyContent } from '@/app/api/property-content/[hotelKey]/route';
import { getReviewSummary, isReviewProviderConfigured } from '@/lib/reviews';
import { fetchGooglePlacesReviews } from '@/lib/reviews/google-places';

describe('reviews and property content APIs', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('returns unavailable review summary by default', async () => {
    const response = await getReviews(new Request('http://localhost:3000/api/reviews/g1-d1'), {
      params: Promise.resolve({ hotelKey: 'g1-d1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.available).toBe(false);
    expect(body.verified).toBe(false);
    expect(body.reviews).toEqual([]);
    expect(body.rating).toBeNull();
  });

  it('returns unavailable property content sections without fabricated facts', async () => {
    const response = await getPropertyContent(new Request('http://localhost:3000/api/property-content/g1-d1'), {
      params: Promise.resolve({ hotelKey: 'g1-d1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sections.amenities.available).toBe(false);
    expect(body.sections.policies.items).toEqual([]);
    expect(body.sections.starRating.value).toBeNull();
    expect(body.sections.taxesAndFees.source).toBeNull();
  });

  it('returns 404 for unknown hotels', async () => {
    const reviewsResponse = await getReviews(new Request('http://localhost:3000/api/reviews/missing'), {
      params: Promise.resolve({ hotelKey: 'missing' }),
    });
    const propertyContentResponse = await getPropertyContent(
      new Request('http://localhost:3000/api/property-content/missing'),
      {
        params: Promise.resolve({ hotelKey: 'missing' }),
      }
    );

    expect(reviewsResponse.status).toBe(404);
    expect(propertyContentResponse.status).toBe(404);
  });

  it('returns licensed Google Places review summaries without fabricating review rows', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    vi.mocked(fetchGooglePlacesReviews).mockResolvedValueOnce({
      rating: 4.7,
      count: 18,
      reviews: [],
    });

    const summary = await getReviewSummary('g1-d1', {
      env: {
        REVIEWS_PROVIDER_NAME: 'Google',
        REVIEWS_PROVIDER_LICENSED: 'true',
        GOOGLE_PLACES_API_KEY: 'unit-test-google-places-key',
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl,
    });

    expect(isReviewProviderConfigured({
      REVIEWS_PROVIDER_NAME: 'Google',
      REVIEWS_PROVIDER_LICENSED: 'true',
      GOOGLE_PLACES_API_KEY: 'unit-test-google-places-key',
    } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(fetchGooglePlacesReviews).toHaveBeenCalledWith(
      expect.objectContaining({ hotelKey: 'g1-d1', name: 'Verified Hotel' }),
      expect.objectContaining({
        apiKey: 'unit-test-google-places-key',
        fetchImpl,
      })
    );
    expect(summary).toEqual(expect.objectContaining({
      available: true,
      source: 'google-places',
      verified: true,
      count: 18,
      rating: 4.7,
      reviews: [],
    }));
  });

  it('falls back to unavailable reviews for unlicensed, unknown, empty, or failing providers', async () => {
    expect(isReviewProviderConfigured({
      REVIEWS_PROVIDER_NAME: 'Google',
      REVIEWS_PROVIDER_LICENSED: 'false',
      GOOGLE_PLACES_API_KEY: 'unit-test-google-places-key',
    } as unknown as NodeJS.ProcessEnv)).toBe(false);

    const unknownProvider = await getReviewSummary('g1-d1', {
      env: {
        REVIEWS_PROVIDER_NAME: 'internal-provider',
        REVIEWS_PROVIDER_LICENSED: 'true',
      } as unknown as NodeJS.ProcessEnv,
    });
    expect(unknownProvider).toEqual(expect.objectContaining({ available: false, reviews: [] }));

    vi.mocked(fetchGooglePlacesReviews).mockResolvedValueOnce({
      rating: null,
      count: 0,
      reviews: [],
    });
    const emptyGoogle = await getReviewSummary('g1-d1', {
      env: {
        REVIEWS_PROVIDER_NAME: 'google-places',
        REVIEWS_PROVIDER_LICENSED: 'true',
        GOOGLE_PLACES_API_KEY: 'unit-test-google-places-key',
      } as unknown as NodeJS.ProcessEnv,
    });
    expect(emptyGoogle).toEqual(expect.objectContaining({ available: false, reviews: [] }));

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(fetchGooglePlacesReviews).mockRejectedValueOnce(new Error('provider unavailable'));
    const failedGoogle = await getReviewSummary('g1-d1', {
      env: {
        REVIEWS_PROVIDER_NAME: 'google',
        REVIEWS_PROVIDER_LICENSED: 'true',
        GOOGLE_PLACES_API_KEY: 'unit-test-google-places-key',
      } as unknown as NodeJS.ProcessEnv,
    });

    expect(failedGoogle).toEqual(expect.objectContaining({ available: false, reviews: [] }));
    expect(warn).toHaveBeenCalledWith(
      'getReviewSummary: provider fetch failed; returning unavailable',
      expect.any(Error)
    );
  });
});
