// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// All storage reads return empty → empty activity feed.
vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { recentlyViewed: 'rv', favorites: 'fav', trips: 'trips', recentSearches: 'rs', priceAlerts: 'pa' },
  LEGACY_LOCAL_STORAGE_KEYS: { recentlyViewed: 'rv2', favorites: 'fav2', trips: 'trips2', recentSearches: 'rs2', recentSearchesUnprefixed: 'rs3' },
  readLocalStorageJsonWithFallback: (_key: string, _f: unknown, fallback: unknown) => fallback,
}));

import ActivityFeed from '@/components/ActivityFeed';

describe('ActivityFeed', () => {
  it('shows an empty state when there is no recorded activity', async () => {
    render(<ActivityFeed />);
    await waitFor(() => {
      expect(screen.getByText(/No activity yet\. Start exploring hotels!/i)).toBeInTheDocument();
    });
  });
});
