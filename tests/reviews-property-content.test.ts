import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hotels-catalog', () => ({
  findHotel: vi.fn((hotelKey: string) => (
    hotelKey === 'g1-d1'
      ? { hotelKey, name: 'Verified Hotel', city: 'Paris', country: 'France' }
      : null
  )),
}));

import { GET as getReviews } from '@/app/api/reviews/[hotelKey]/route';
import { GET as getPropertyContent } from '@/app/api/property-content/[hotelKey]/route';

describe('reviews and property content APIs', () => {
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
});
