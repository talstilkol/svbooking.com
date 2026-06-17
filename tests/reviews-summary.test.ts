import { describe, it, expect, vi } from 'vitest';
import { getReviewSummary, isReviewProviderConfigured } from '@/lib/reviews';
import { fetchGooglePlacesReviews, normalizeGooglePlaces } from '@/lib/reviews/google-places';
import { HOTELS } from '@/lib/hotels-catalog';

const SAMPLE_KEY = (HOTELS[0] as { hotelKey: string }).hotelKey;

// Build a ProcessEnv-typed object from a plain map (avoids NODE_ENV overlap error).
const asEnv = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

describe('isReviewProviderConfigured', () => {
  it('is false without both env markers', () => {
    expect(isReviewProviderConfigured(asEnv({}))).toBe(false);
    expect(isReviewProviderConfigured(asEnv({ REVIEWS_PROVIDER_NAME: 'google-places' }))).toBe(false);
    expect(isReviewProviderConfigured(asEnv({
      REVIEWS_PROVIDER_NAME: 'google-places',
      REVIEWS_PROVIDER_LICENSED: 'true',
    }))).toBe(false);
  });
  it('is true when a supported provider is licensed and credentialed', () => {
    expect(
      isReviewProviderConfigured(
        asEnv({
          REVIEWS_PROVIDER_NAME: 'google-places',
          REVIEWS_PROVIDER_LICENSED: 'true',
          GOOGLE_PLACES_API_KEY: 'unit-test-google-places-key',
        })
      )
    ).toBe(true);
  });

  it('is false for licensed but unsupported providers', () => {
    expect(isReviewProviderConfigured(asEnv({
      REVIEWS_PROVIDER_NAME: 'internal-provider',
      REVIEWS_PROVIDER_LICENSED: 'true',
      GOOGLE_PLACES_API_KEY: 'unit-test-google-places-key',
    }))).toBe(false);
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

  it('normalizes invalid review fields without inventing author, rating, or dates', () => {
    const out = normalizeGooglePlaces({
      rating: 'not-rated',
      user_ratings_total: 'not-counted',
      reviews: [
        {
          text: 'Verified stay. '.repeat(80),
          rating: 'not-a-number',
          time: 'not-a-time',
        },
      ],
    });

    expect(out.rating).toBeNull();
    expect(out.count).toBeNull();
    expect(out.reviews).toEqual([
      {
        author: null,
        rating: null,
        text: 'Verified stay. '.repeat(80).slice(0, 600),
        time: null,
        relativeTime: null,
      },
    ]);

    expect(normalizeGooglePlaces({
      reviews: [{ author_name: 'Dana', rating: 5, time: 1700000000 }],
    }).reviews[0].text).toBe('');
  });
});

describe('fetchGooglePlacesReviews', () => {
  it('fails closed when required configuration or hotel identity is missing', async () => {
    await expect(fetchGooglePlacesReviews({ name: 'Le Meurice' }, { apiKey: '' }))
      .rejects.toThrow('GOOGLE_PLACES_API_KEY is not configured');
    await expect(fetchGooglePlacesReviews(null, { apiKey: 'key' }))
      .rejects.toThrow('hotel name is required');
  });

  it('returns null when place details do not include a result object', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ candidates: [{ place_id: 'PID' }] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    await expect(fetchGooglePlacesReviews(
      { name: 'Le Meurice', city: 'Paris', country: 'France' },
      { apiKey: 'key', fetchImpl: fetchImpl as unknown as typeof fetch }
    )).resolves.toBeNull();
    expect(String((fetchImpl.mock.calls[0] as unknown[])[0])).toContain('Le%20Meurice%2C%20Paris%2C%20France');
  });

  it('throws on failed Google Places HTTP responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 429 });

    await expect(fetchGooglePlacesReviews(
      { name: 'Le Meurice', city: 'Paris', country: 'France' },
      { apiKey: 'key', fetchImpl: fetchImpl as unknown as typeof fetch }
    )).rejects.toThrow('HTTP 429');
  });

  it('aborts slow Google Places requests', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn((_url: string, init?: RequestInit) => (
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        })
      ));

      const pending = fetchGooglePlacesReviews(
        { name: 'Le Meurice', city: 'Paris', country: 'France' },
        { apiKey: 'key', fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 25 }
      ).catch((error: Error) => error);
      await vi.advanceTimersByTimeAsync(25);

      await expect(pending).resolves.toMatchObject({ name: 'AbortError' });
    } finally {
      vi.useRealTimers();
    }
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
      env: asEnv({
        REVIEWS_PROVIDER_NAME: 'google-places',
        REVIEWS_PROVIDER_LICENSED: 'true',
        GOOGLE_PLACES_API_KEY: 'unit-test-google-places-key',
      }),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(s).toMatchObject({ available: true, source: 'google-places', verified: true, rating: 4.2, count: 88 });
    expect(s?.reviews?.[0]).toMatchObject({ author: 'Dana', rating: 4 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not invent review snippets when the provider only returns aggregate ratings', async () => {
    const reviewsModule = await import('@/lib/reviews/google-places');
    const fetchSpy = vi.spyOn(reviewsModule, 'fetchGooglePlacesReviews').mockResolvedValueOnce({
      rating: 4.1,
      count: 42,
    } as Awaited<ReturnType<typeof fetchGooglePlacesReviews>>);

    const s = await getReviewSummary(SAMPLE_KEY, {
      env: asEnv({
        REVIEWS_PROVIDER_NAME: 'google-places',
        REVIEWS_PROVIDER_LICENSED: 'true',
        GOOGLE_PLACES_API_KEY: 'unit-test-google-places-key',
      }),
    });

    expect(s).toMatchObject({
      available: true,
      source: 'google-places',
      rating: 4.1,
      count: 42,
      reviews: [],
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it('falls back to unavailable when the provider fetch fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
    const s = await getReviewSummary(SAMPLE_KEY, {
      env: asEnv({
        REVIEWS_PROVIDER_NAME: 'google-places',
        REVIEWS_PROVIDER_LICENSED: 'true',
        GOOGLE_PLACES_API_KEY: 'unit-test-google-places-key',
      }),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(s).toMatchObject({ available: false, status: 'unavailable' });
  });

  it('falls back to unavailable when place is not found', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ candidates: [] }) });
    const s = await getReviewSummary(SAMPLE_KEY, {
      env: asEnv({
        REVIEWS_PROVIDER_NAME: 'google-places',
        REVIEWS_PROVIDER_LICENSED: 'true',
        GOOGLE_PLACES_API_KEY: 'unit-test-google-places-key',
      }),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(s).toMatchObject({ available: false });
  });

  it('keeps unknown licensed provider names unavailable', async () => {
    const s = await getReviewSummary(SAMPLE_KEY, {
      env: asEnv({ REVIEWS_PROVIDER_NAME: 'licensed-but-unsupported', REVIEWS_PROVIDER_LICENSED: 'true' }),
    });

    expect(s).toMatchObject({ available: false, source: null, verified: false });
  });
});
