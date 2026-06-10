// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

const storage = vi.hoisted(() => ({
  values: {} as Record<string, unknown>,
}));

vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { locale: 'locale', recentlyViewed: 'rv', favorites: 'fav', trips: 'trips', recentSearches: 'rs', priceAlerts: 'pa' },
  LEGACY_LOCAL_STORAGE_KEYS: { recentlyViewed: 'rv2', favorites: 'fav2', trips: 'trips2', recentSearches: 'rs2', recentSearchesUnprefixed: 'rs3' },
  readLocalStorageStringWithFallback: (key: string) => (storage.values[key] as string) ?? null,
  readLocalStorageJsonWithFallback: (key: string, _f: unknown, fallback: unknown) => storage.values[key] ?? fallback,
  writeLocalStorageJson: (key: string, value: unknown) => { storage.values[key] = value; },
}));

import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import ActivityFeed from '@/components/ActivityFeed';

beforeEach(() => {
  for (const key of Object.keys(storage.values)) delete storage.values[key];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ActivityFeed', () => {
  it('shows an empty state when there is no recorded activity', async () => {
    render(<ActivityFeed />);
    await waitFor(() => {
      expect(screen.getByText(/No activity yet\. Start exploring hotels!/i)).toBeInTheDocument();
    });
  });

  it('switches recorded activity copy and relative times to Hebrew', async () => {
    const user = userEvent.setup();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-10T12:00:00.000Z'));
    storage.values.rv = [{
      hotelKey: 'g1-d2',
      name: 'Le Meurice',
      city: 'Paris',
      timestamp: Date.parse('2026-06-10T11:30:00.000Z'),
    }];
    storage.values.rs = [{
      query: 'Paris',
      count: 1,
      timestamp: Date.parse('2026-06-10T11:00:00.000Z'),
    }];

    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <ActivityFeed />
      </LocaleProvider>
    );

    expect(await screen.findByText('Viewed Le Meurice')).toBeInTheDocument();
    expect(screen.getByText('30m ago')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(await screen.findByText('נצפה Le Meurice')).toBeInTheDocument();
    expect(screen.getByText(/פעילות אחרונה/)).toBeInTheDocument();
    expect(screen.getByText('1 תוצאה')).toBeInTheDocument();
    expect(screen.getByText('לפני 30 דקות')).toBeInTheDocument();
    expect(screen.getByText('לפני 1 שעה')).toBeInTheDocument();

    nowSpy.mockRestore();
  });
});
