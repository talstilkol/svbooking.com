import { describe, it, expect, vi } from 'vitest';
import { getReviewSummary, getUnavailableReviewSummary, isReviewProviderConfigured } from '@/lib/reviews';
import { normalizeGooglePlaces } from '@/lib/reviews/google-places';
import { HOTELS } from '@/lib/hotels-catalog';

const SAMPLE_KEY = (HOTELS[0] as { hotelKey: string }).hotelKey;

// Build a ProcessEnv-typed object from a plain map (avoids NODE_ENV overlap error).
const asEnv = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

describe('isReviewProviderConfigured', () => {
  it('is false without both env markers', () => {
    expect(isReviewProviderConfigured(asEnv({}))).toBe(false);
    expect(isReviewProviderConfigured(asEnv({ REVIEWS_PROVIDER_NAME: 'google-places' }))).toBe(false);
  });
  it('is true when name is set and licensed', () => {
    expect(
      isReviewProviderConfigured(
        asEnv({ REVIEWS_PROVIDER_NAME: 'google-places', REVIEWS_PROVIDER_LICENSED: 'true' })
      )
    ).toBe(true);
  });
});

describe('normalizeGooglePlaces', () => {
  it('maps rating, count, and up to 5 reviews', () => {
    const out = normalizeGooglePlaces({
      rating: 4.5,
      user_ratings_total: 1234,
      reviews: Array.from({ length: 8 }, (_, i) => ({
        author_name: `A${i}`,
        rating: 5,
        text: 'Great stay',
        time: 1700000000,
        relative_time_description: 'a month ago',
      })),
    });
    expect(out.rating).toBe(4.5);
    expect(out.count).toBe(1234);
    expect(out.reviews).toHaveLength(5);
    expect(out.reviews[0]).toMatchObject({ author: 'A0', rating: 5 });
    expect(out.reviews[0].time).toMatch(/^20\d\d-/);
  });

  it('handles missing fields safely', () => {
    expect(normalizeGooglePlaces({})).toEqual({ rating: null, count: null, reviews: [] });
    expect(normalizeGooglePlaces(null)).toEqual({ rating: null, count: null, reviews: [] });
  });
});

describe('getReviewSummary', () => {
  it('returns null for an unknown hotel', async () => {
    expect(await getReviewSummary('nope-nope')).toBeNull();
  });

  it('returns unavailable when no provider configured', async () => {
    const s = await getReviewSummary(SAMPLE_KEY, { env: asEnv({}) });
    expect(s).toMatchObject({ available: false, status: 'unavailable', source: null });
  });

  it('returns real reviews when google-places is configured', async () => {
    const fetchImpl = vi.fn()
      // findplacefromtext
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ candidates: [{ place_id: 'PID' }] }) })
      // details
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: { rating: 4.2, user_ratings_total: 88, reviews: [{ author_name: 'Dana', rating: 4, text: 'Clean', time: 1700000000 }] },
        }),
      });

    const s = await getReviewSummary(SAMPLE_KEY, {
      env: asEnv({ REVIEWS_PROVIDER_NAME: 'google-places', REVIEWS_PROVIDER_LICENSED: 'true', GOOGLE_PLACES_API_KEY: 'k' }),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(s).toMatchObject({ available: true, source: 'google-places', verified: true, rating: 4.2, count: 88 });
    expect(s?.reviews?.[0]).toMatchObject({ author: 'Dana', rating: 4 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('falls back to unavailable when the provider fetch fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
    const s = await getReviewSummary(SAMPLE_KEY, {
      env: asEnv({ REVIEWS_PROVIDER_NAME: 'google-places', REVIEWS_PROVIDER_LICENSED: 'true', GOOGLE_PLACES_API_KEY: 'k' }),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(s).toMatchObject({ available: false, status: 'unavailable' });
  });

  it('falls back to unavailable when place is not found', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ candidates: [] }) });
    const s = await getReviewSummary(SAMPLE_KEY, {
      env: asEnv({ REVIEWS_PROVIDER_NAME: 'google-places', REVIEWS_PROVIDER_LICENSED: 'true', GOOGLE_PLACES_API_KEY: 'k' }),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(s).toMatchObject({ available: false });
  });
});
