import type { FavoriteHotel, SavedTrip } from './useLocalStorage';

export interface Suggestion {
  id: string;
  kind: 'home_city' | 'check_prices' | 'plan_trip' | 'compare';
  title: string;
  description: string;
  action: { label: string; href: string };
  priority: number; // higher = more important
}

export function buildSuggestions({
  favorites,
  trips,
  prefsHomeCity,
}: {
  favorites: FavoriteHotel[];
  trips: SavedTrip[];
  prefsHomeCity?: string;
}): Suggestion[] {
  const out: Suggestion[] = [];

  // 1. Trips starting soon → re-check prices
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  trips.forEach((t) => {
    const ms = new Date(t.checkIn).getTime() - now;
    if (ms > 0 && ms < sevenDays) {
      const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
      out.push({
        id: `recheck-${t.id}`,
        kind: 'check_prices',
        title: `Your ${t.hotelName} trip starts in ${days} day${days !== 1 ? 's' : ''}`,
        description: `Re-run the AI agent to confirm you still have the best price.`,
        action: { label: 'Check now', href: `/trips#${t.id}` },
        priority: 10 - days,
      });
    }
  });

  // 2. Frequently favorited city → suggest as home city
  if (favorites.length >= 2 && !prefsHomeCity) {
    const cityCounts = new Map<string, number>();
    favorites.forEach((f) => cityCounts.set(f.city, (cityCounts.get(f.city) || 0) + 1));
    let topCity = '';
    let topCount = 0;
    cityCounts.forEach((c, k) => {
      if (c > topCount) {
        topCount = c;
        topCity = k;
      }
    });
    if (topCount >= 2 && topCity) {
      out.push({
        id: `home-${topCity}`,
        kind: 'home_city',
        title: `Set ${topCity} as your home city?`,
        description: `You've favorited ${topCount} hotels there. Save it for faster searches.`,
        action: { label: 'Open profile', href: '/profile' },
        priority: 5,
      });
    }
  }

  // 3. Favorites without a trip → plan one
  favorites.slice(0, 3).forEach((f) => {
    const hasTrip = trips.some((t) => t.hotelKey === f.hotelKey);
    if (!hasTrip) {
      out.push({
        id: `plan-${f.hotelKey}`,
        kind: 'plan_trip',
        title: `Plan a stay at ${f.name}?`,
        description: `You favorited it but haven't planned a trip yet.`,
        action: { label: 'Plan trip', href: `/trips?hotelKey=${encodeURIComponent(f.hotelKey)}` },
        priority: 3,
      });
    }
  });

  // 4. Home city set but no recent trip → compare prices
  if (prefsHomeCity && trips.length === 0) {
    out.push({
      id: `compare-home`,
      kind: 'compare',
      title: `Looking to travel from ${prefsHomeCity}?`,
      description: `Compare live prices across providers for your favorite destinations.`,
      action: { label: 'Compare hotels', href: '/compare' },
      priority: 2,
    });
  }

  return out.sort((a, b) => b.priority - a.priority).slice(0, 4);
}
