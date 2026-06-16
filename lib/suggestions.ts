import type { FavoriteHotel, SavedTrip } from './useLocalStorage';

export interface Suggestion {
  id: string;
  kind: 'home_city' | 'check_prices' | 'plan_trip' | 'compare';
  title: string;
  description: string;
  action: { label: string; href: string };
  priority: number; // higher = more important
}

type Translate = (key: string) => string;

const DEFAULT_COPY: Record<string, string> = {
  suggestionTripStartsOneDay: 'Your {hotelName} trip starts in 1 day',
  suggestionTripStartsDays: 'Your {hotelName} trip starts in {days} days',
  suggestionRefreshPricesDesc: 'Re-run the AI agent to refresh available provider prices.',
  suggestionCheckNow: 'Check now',
  suggestionSetHomeCityTitle: 'Set {city} as your home city?',
  suggestionSetHomeCityDesc: "You've favorited {count} hotels there. Save it for faster searches.",
  suggestionOpenProfile: 'Open profile',
  suggestionPlanStayTitle: 'Plan a stay at {hotelName}?',
  suggestionPlanStayDesc: "You favorited it but haven't planned a trip yet.",
  suggestionPlanTrip: 'Plan trip',
  suggestionTravelFromTitle: 'Looking to travel from {city}?',
  suggestionComparePricesDesc: 'Compare provider-returned prices for your favorite destinations when verified rates are available.',
  suggestionCompareHotels: 'Compare hotels',
};

function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  ));
}

function copy(t: Translate, key: string, values: Record<string, string | number> = {}): string {
  return interpolate(t(key), values);
}

export function buildSuggestions({
  favorites,
  trips,
  prefsHomeCity,
  t = (key) => DEFAULT_COPY[key as keyof typeof DEFAULT_COPY],
}: {
  favorites: FavoriteHotel[];
  trips: SavedTrip[];
  prefsHomeCity?: string;
  t?: Translate;
}): Suggestion[] {
  const out: Suggestion[] = [];

  // 1. Trips starting soon → re-check prices
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  trips.forEach((trip) => {
    const ms = new Date(trip.checkIn).getTime() - now;
    if (ms > 0 && ms < sevenDays) {
      const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
      out.push({
        id: `recheck-${trip.id}`,
        kind: 'check_prices',
        title: copy(t, days === 1 ? 'suggestionTripStartsOneDay' : 'suggestionTripStartsDays', {
          hotelName: trip.hotelName,
          days,
        }),
        description: copy(t, 'suggestionRefreshPricesDesc'),
        action: { label: copy(t, 'suggestionCheckNow'), href: `/trips#${trip.id}` },
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
        title: copy(t, 'suggestionSetHomeCityTitle', { city: topCity }),
        description: copy(t, 'suggestionSetHomeCityDesc', { count: topCount }),
        action: { label: copy(t, 'suggestionOpenProfile'), href: '/profile' },
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
        title: copy(t, 'suggestionPlanStayTitle', { hotelName: f.name }),
        description: copy(t, 'suggestionPlanStayDesc'),
        action: { label: copy(t, 'suggestionPlanTrip'), href: `/trips?hotelKey=${encodeURIComponent(f.hotelKey)}` },
        priority: 3,
      });
    }
  });

  // 4. Home city set but no recent trip → compare prices
  if (prefsHomeCity && trips.length === 0) {
    out.push({
      id: `compare-home`,
      kind: 'compare',
      title: copy(t, 'suggestionTravelFromTitle', { city: prefsHomeCity }),
      description: copy(t, 'suggestionComparePricesDesc'),
      action: { label: copy(t, 'suggestionCompareHotels'), href: '/compare' },
      priority: 2,
    });
  }

  return out.sort((a, b) => b.priority - a.priority).slice(0, 4);
}
