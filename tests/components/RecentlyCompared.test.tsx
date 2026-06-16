// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';

const store: Record<string, unknown> = {};
vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { recentlyCompared: 'svbooking:recently-compared' },
  readLocalStorageJson: (key: string, fallback: unknown) => store[key] ?? fallback,
  writeLocalStorageJson: (key: string, value: unknown) => { store[key] = value; },
}));

import RecentlyCompared, { addToRecentlyCompared } from '@/components/RecentlyCompared';

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

const KEY = 'svbooking:recently-compared';

async function renderAndFlush(ui: ReactElement) {
  const rendered = render(ui);
  await act(async () => {
    await Promise.resolve();
  });
  return rendered;
}

describe('addToRecentlyCompared', () => {
  it('prepends a hotel with a timestamp', () => {
    addToRecentlyCompared({ hotelKey: 'g1-d1', name: 'A', city: 'Paris' });
    const saved = store[KEY] as Array<{ hotelKey: string; timestamp: string }>;
    expect(saved).toHaveLength(1);
    expect(saved[0].hotelKey).toBe('g1-d1');
    expect(saved[0].timestamp).toMatch(/^20\d\d-/);
  });

  it('de-duplicates by hotelKey, moving the newest to front', () => {
    addToRecentlyCompared({ hotelKey: 'g1-d1', name: 'A', city: 'Paris' });
    addToRecentlyCompared({ hotelKey: 'g1-d2', name: 'B', city: 'Rome' });
    addToRecentlyCompared({ hotelKey: 'g1-d1', name: 'A', city: 'Paris' });
    const saved = store[KEY] as Array<{ hotelKey: string }>;
    expect(saved).toHaveLength(2);
    expect(saved[0].hotelKey).toBe('g1-d1');
  });

  it('caps the list at 6 entries', () => {
    for (let i = 0; i < 9; i++) {
      addToRecentlyCompared({ hotelKey: `k${i}`, name: `H${i}`, city: 'X' });
    }
    const saved = store[KEY] as unknown[];
    expect(saved).toHaveLength(6);
  });
});

describe('RecentlyCompared component', () => {
  it('renders nothing when nothing has been compared', async () => {
    const { container } = await renderAndFlush(<RecentlyCompared />);
    expect(container.firstChild).toBeNull();
  });
});
