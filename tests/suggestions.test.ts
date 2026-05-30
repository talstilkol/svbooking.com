import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSuggestions } from '@/lib/suggestions';
import type { FavoriteHotel, SavedTrip } from '@/lib/useLocalStorage';

function favorite(overrides: Partial<FavoriteHotel> = {}): FavoriteHotel {
  return {
    hotelKey: 'g187147-d188728',
    name: 'Le Meurice',
    city: 'Paris',
    country: 'France',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
    addedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function trip(overrides: Partial<SavedTrip> = {}): SavedTrip {
  return {
    id: 'trip-paris',
    hotelKey: 'g187147-d188728',
    hotelName: 'Le Meurice',
    city: 'Paris',
    country: 'France',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
    checkIn: '2026-06-03',
    checkOut: '2026-06-05',
    guests: 2,
    createdAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildSuggestions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prioritizes imminent trip price checks ahead of planning and home-city prompts', () => {
    const suggestions = buildSuggestions({
      favorites: [
        favorite(),
        favorite({ hotelKey: 'g187147-d197896', name: 'Ritz Paris' }),
        favorite({ hotelKey: 'g60763-d93562', name: 'The Plaza', city: 'New York', country: 'United States' }),
      ],
      trips: [trip()],
    });

    expect(suggestions.map((suggestion) => suggestion.kind)).toEqual([
      'check_prices',
      'home_city',
      'plan_trip',
      'plan_trip',
    ]);
    expect(suggestions[0]).toMatchObject({
      id: 'recheck-trip-paris',
      title: 'Your Le Meurice trip starts in 3 days',
      action: { label: 'Check now', href: '/trips#trip-paris' },
    });
  });

  it('suggests compare when a home city exists and no trips are saved', () => {
    const suggestions = buildSuggestions({
      favorites: [],
      trips: [],
      prefsHomeCity: 'Tel Aviv',
    });

    expect(suggestions).toEqual([
      {
        id: 'compare-home',
        kind: 'compare',
        title: 'Looking to travel from Tel Aviv?',
        description: 'Compare provider-returned prices for your favorite destinations when verified rates are available.',
        action: { label: 'Compare hotels', href: '/compare' },
        priority: 2,
      },
    ]);
  });

  it('returns at most four suggestions and avoids home-city prompts when already configured', () => {
    const suggestions = buildSuggestions({
      favorites: [
        favorite(),
        favorite({ hotelKey: 'g187147-d197896', name: 'Ritz Paris' }),
        favorite({ hotelKey: 'g187147-d233593', name: 'Hotel Bel Ami' }),
        favorite({ hotelKey: 'g60763-d93562', name: 'The Plaza', city: 'New York', country: 'United States' }),
        favorite({ hotelKey: 'g60763-d112245', name: 'The Knickerbocker', city: 'New York', country: 'United States' }),
      ],
      trips: [],
      prefsHomeCity: 'Paris',
    });

    expect(suggestions).toHaveLength(4);
    expect(suggestions.some((suggestion) => suggestion.kind === 'home_city')).toBe(false);
    expect(suggestions.map((suggestion) => suggestion.priority)).toEqual([3, 3, 3, 2]);
  });
});
