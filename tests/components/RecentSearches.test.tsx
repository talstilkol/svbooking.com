// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const store: Record<string, unknown> = {};
vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { recentSearches: 'svbooking:recent-searches' },
  LEGACY_LOCAL_STORAGE_KEYS: { recentSearches: 'recent-searches', recentSearchesUnprefixed: 'searches' },
  readLocalStorageJsonWithFallback: (key: string, _f: unknown, fallback: unknown) => store[key] ?? fallback,
  writeLocalStorageJson: (key: string, value: unknown) => { store[key] = value; },
  removeLocalStorageKeys: (keys: string[]) => { keys.forEach((k) => delete store[k]); },
}));

import RecentSearches, { addRecentSearch } from '@/components/RecentSearches';

const KEY = 'svbooking:recent-searches';

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

describe('addRecentSearch', () => {
  it('stores a query at the front', () => {
    addRecentSearch('Paris', 12);
    const saved = store[KEY] as Array<{ query: string; resultCount?: number }>;
    expect(saved[0].query).toBe('Paris');
    expect(saved[0].resultCount).toBe(12);
  });

  it('de-duplicates case-insensitively', () => {
    addRecentSearch('Paris');
    addRecentSearch('Tokyo');
    addRecentSearch('paris');
    const saved = store[KEY] as Array<{ query: string }>;
    expect(saved).toHaveLength(2);
    expect(saved[0].query).toBe('paris');
  });

  it('caps the list at 8 entries', () => {
    for (let i = 0; i < 12; i++) addRecentSearch(`q${i}`);
    expect((store[KEY] as unknown[]).length).toBe(8);
  });
});

describe('RecentSearches component', () => {
  it('renders nothing with no history', () => {
    const { container } = render(<RecentSearches />);
    expect(container.firstChild).toBeNull();
  });

  it('renders stored searches as links', () => {
    store[KEY] = [{ query: 'Paris', timestamp: Date.now() }];
    render(<RecentSearches />);
    expect(screen.getByText('Paris')).toBeInTheDocument();
  });
});
