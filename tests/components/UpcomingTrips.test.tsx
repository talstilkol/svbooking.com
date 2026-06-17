// @vitest-environment jsdom
import type { ReactElement } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const FIXED_NOW = new Date('2026-06-16T23:00:00.000+03:00');
const mockStore: Record<string, unknown> = {};

vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: {
    trips: 'svbooking:trips',
    locale: 'svbooking:locale',
  },
  LEGACY_LOCAL_STORAGE_KEYS: {
    trips: 'saved-trips',
  },
  readLocalStorageJsonWithFallback: (key: string, fallbackKeys: string[], fallback: unknown) => {
    if (mockStore[key] !== undefined) return mockStore[key];
    for (const fallbackKey of fallbackKeys) {
      if (mockStore[fallbackKey] !== undefined) return mockStore[fallbackKey];
    }
    return fallback;
  },
  readLocalStorageStringWithFallback: (key: string, _fallbackKeys: string[], fallback: string | null) =>
    (mockStore[key] as string | undefined) ?? fallback,
  writeLocalStorageJson: (key: string, value: unknown) => {
    mockStore[key] = value;
  },
}));

import { LocaleProvider } from '@/components/LocaleProvider';
import UpcomingTrips from '@/components/UpcomingTrips';

function storeTrips(trips: Array<{
  id: string;
  hotelKey: string;
  hotelName: string;
  city: string;
  country: string;
  image: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}>) {
  mockStore['svbooking:trips'] = trips;
}

async function renderAndFlush(ui: ReactElement) {
  const rendered = render(ui);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return rendered;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXED_NOW);
  for (const key of Object.keys(mockStore)) delete mockStore[key];
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

afterEach(() => {
  for (const key of Object.keys(mockStore)) delete mockStore[key];
  vi.useRealTimers();
});

describe('UpcomingTrips', () => {
  it('renders the localized English empty state', async () => {
    await renderAndFlush(<UpcomingTrips />);

    expect(screen.getByText('No upcoming trips')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plan a trip →' })).toHaveAttribute('href', '/trips');
  });

  it('renders deterministic English trip timing and stay details', async () => {
    storeTrips([
      {
        id: 'trip-1',
        hotelKey: 'le-meurice',
        hotelName: 'Le Meurice',
        city: 'Paris',
        country: 'France',
        image: '/le-meurice.jpg',
        checkIn: '2026-06-18T00:00:00.000+03:00',
        checkOut: '2026-06-20T00:00:00.000+03:00',
        guests: 2,
      },
    ]);

    await renderAndFlush(<UpcomingTrips />);

    expect(screen.getByText('✈️ Upcoming Trips')).toBeInTheDocument();
    expect(screen.getByText('Paris · 2 nights · 2 guests')).toBeInTheDocument();
    expect(screen.getByText('2 days')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Le Meurice/ })).toHaveAttribute('href', '/hotel/le-meurice');
  });

  it('renders Hebrew labels from the locale dictionary', async () => {
    mockStore['svbooking:locale'] = 'he';
    storeTrips([
      {
        id: 'trip-2',
        hotelKey: 'ritz-paris',
        hotelName: 'Ritz Paris',
        city: 'Paris',
        country: 'France',
        image: '/ritz-paris.jpg',
        checkIn: '2026-06-17T00:00:00.000+03:00',
        checkOut: '2026-06-18T00:00:00.000+03:00',
        guests: 1,
      },
    ]);

    await renderAndFlush(
      <LocaleProvider>
        <UpcomingTrips />
      </LocaleProvider>
    );

    expect(await screen.findByText('✈️ טיולים קרובים')).toBeInTheDocument();
    expect(screen.getByText('Paris · 1 לילה · 1 אורח')).toBeInTheDocument();
    expect(screen.getByText('מחר')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ritz Paris/ })).toHaveAttribute('href', '/hotel/ritz-paris');
  });
});
