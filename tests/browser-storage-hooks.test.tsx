// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHistory } from '@/lib/useHistory';
import {
  LEGACY_LOCAL_STORAGE_KEYS,
  LOCAL_STORAGE_KEYS,
} from '@/lib/local-storage-keys';
import {
  useFavorites,
  useLocalStorage,
  useRecentlyViewed,
  useTrips,
} from '@/lib/useLocalStorage';
import { detectCurrency, getCurrencyCode, setCurrencyCode } from '@/lib/currency';
import { hashId } from '@/lib/utils/hashId';

function installLocalStorageStub() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    get length() {
      return store.size;
    },
  };

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

async function flushHydration() {
  await act(async () => {
    await Promise.resolve();
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

beforeEach(() => {
  installLocalStorageStub();
  localStorage.clear();
});

describe('useLocalStorage hook', () => {
  it('hydrates from legacy keys, migrates to the canonical key, and persists updates', async () => {
    localStorage.setItem('legacy-counter', JSON.stringify({ count: 7 }));

    let api!: ReturnType<typeof useLocalStorage<{ count: number }>>;
    function Harness() {
      api = useLocalStorage('canonical-counter', { count: 0 }, ['legacy-counter']);
      return <output>{`${api[0].count}:${api[2]}`}</output>;
    }

    const view = render(<Harness />);
    expect(view.container.textContent).toBe('0:false');

    await flushHydration();

    expect(view.container.textContent).toBe('7:true');
    expect(localStorage.getItem('canonical-counter')).toBe(JSON.stringify({ count: 7 }));

    act(() => {
      api[1]((prev) => ({ count: prev.count + 1 }));
    });

    expect(view.container.textContent).toBe('8:true');
    expect(localStorage.getItem('canonical-counter')).toBe(JSON.stringify({ count: 8 }));
  });
});

describe('useHistory hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T12:00:00Z'));
  });

  it('caps viewed and search history, deduplicates entries, and clears canonical plus legacy keys', async () => {
    let api!: ReturnType<typeof useHistory>;
    function Harness() {
      api = useHistory();
      return <output>{`${api.history.length}:${api.searchHistory.length}`}</output>;
    }

    const view = render(<Harness />);
    await flushHydration();

    act(() => {
      for (let index = 0; index < 12; index += 1) {
        api.addToHistory({
          hotelKey: `g1-d${index}`,
          name: `Hotel ${index}`,
          city: 'Paris',
          country: 'France',
          image: `https://images.unsplash.com/photo-${index}?w=800&q=80`,
        });
      }
      api.addToHistory({
        hotelKey: 'g1-d5',
        name: 'Hotel 5',
        city: 'Paris',
        country: 'France',
        image: 'https://images.unsplash.com/photo-5?w=800&q=80',
      });
      for (const query of [' Paris ', 'paris', 'London', 'Tokyo', 'Rome', 'Berlin', '']) {
        api.addToSearchHistory(query);
      }
    });

    expect(view.container.textContent).toBe('10:5');
    expect(api.history[0]).toMatchObject({ hotelKey: 'g1-d5', timestamp: Date.parse('2026-05-31T12:00:00Z') });
    expect(api.searchHistory.map((item) => item.query)).toEqual(['Berlin', 'Rome', 'Tokyo', 'London', 'paris']);

    act(() => {
      api.removeFromHistory('g1-d5');
    });
    expect(api.history.some((item) => item.hotelKey === 'g1-d5')).toBe(false);

    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEYS.hotelHistory, JSON.stringify([{ hotelKey: 'legacy' }]));
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEYS.searchHistory, JSON.stringify([{ query: 'legacy' }]));

    act(() => {
      api.clearHistory();
      api.clearSearchHistory();
    });

    expect(api.history).toEqual([]);
    expect(api.searchHistory).toEqual([]);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.hotelHistory)).toBeNull();
    expect(localStorage.getItem(LEGACY_LOCAL_STORAGE_KEYS.hotelHistory)).toBeNull();
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.searchHistory)).toBeNull();
    expect(localStorage.getItem(LEGACY_LOCAL_STORAGE_KEYS.searchHistory)).toBeNull();
  });
});

describe('saved hotel hooks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T12:00:00Z'));
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  });

  it('persists favorites, syncs best-effort cloud mutations, and removes duplicates by hotel key', async () => {
    let api!: ReturnType<typeof useFavorites>;
    function Harness() {
      api = useFavorites();
      return <output>{`${api.favorites.length}:${api.hydrated}`}</output>;
    }

    const view = render(<Harness />);
    await flushHydration();

    await act(async () => {
      await api.toggleFavorite({
        hotelKey: 'g187147-d188728',
        name: 'Le Meurice',
        city: 'Paris',
        country: 'France',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80',
      });
    });

    expect(view.container.textContent).toBe('1:true');
    expect(api.isFavorite('g187147-d188728')).toBe(true);
    expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.favorites) || '[]')).toEqual([
      expect.objectContaining({ hotelKey: 'g187147-d188728', addedAt: '2026-05-31T12:00:00.000Z' }),
    ]);
    expect(vi.mocked(fetch).mock.calls[0]).toMatchObject(['/api/me/favorites', { method: 'POST' }]);

    await act(async () => {
      await api.toggleFavorite({
        hotelKey: 'g187147-d188728',
        name: 'Le Meurice',
        city: 'Paris',
        country: 'France',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80',
      });
    });

    expect(api.favorites).toEqual([]);
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toBe('/api/me/favorites?hotelKey=g187147-d188728');
  });

  it('creates deterministic trip IDs, persists trips, and deletes cloud copies by ID', async () => {
    let api!: ReturnType<typeof useTrips>;
    function Harness() {
      api = useTrips();
      return <output>{`${api.trips.length}:${api.hydrated}`}</output>;
    }

    const view = render(<Harness />);
    await flushHydration();

    let trip!: ReturnType<typeof api.addTrip>;
    act(() => {
      trip = api.addTrip({
        hotelKey: 'g187147-d188728',
        hotelName: 'Le Meurice',
        city: 'Paris',
        country: 'France',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80',
        checkIn: '2026-06-10',
        checkOut: '2026-06-12',
        guests: 2,
        notes: 'Anniversary',
      });
    });

    expect(view.container.textContent).toBe('1:true');
    expect(trip).toMatchObject({
      hotelKey: 'g187147-d188728',
      createdAt: '2026-05-31T12:00:00.000Z',
    });
    expect(trip.id).toBe(hashId('trip', 'g187147-d188728', '2026-06-10', '2026-06-12', 2, 'Anniversary'));

    act(() => {
      api.removeTrip(trip.id);
    });

    expect(api.trips.every((item) => item.id !== trip.id)).toBe(true);
    expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toBe(`/api/me/trips?id=${trip.id}`);
  });

  it('keeps recently viewed hotels bounded and moves repeated views to the front', async () => {
    let api!: ReturnType<typeof useRecentlyViewed>;
    function Harness() {
      api = useRecentlyViewed();
      return <output>{`${api.items.length}:${api.hydrated}`}</output>;
    }

    const view = render(<Harness />);
    await flushHydration();

    act(() => {
      for (let index = 0; index < 12; index += 1) {
        api.addRecentlyViewed({
          hotelKey: `g1-d${index}`,
          name: `Hotel ${index}`,
          city: 'Paris',
          country: 'France',
          image: `https://images.unsplash.com/photo-${index}?w=800&q=80`,
        });
      }
      api.addRecentlyViewed({
        hotelKey: 'g1-d3',
        name: 'Hotel 3',
        city: 'Paris',
        country: 'France',
        image: 'https://images.unsplash.com/photo-3?w=800&q=80',
      });
    });

    expect(view.container.textContent).toBe('10:true');
    expect(api.items[0]).toMatchObject({ hotelKey: 'g1-d3', viewedAt: '2026-05-31T12:00:00.000Z' });
    expect(new Set(api.items.map((item) => item.hotelKey)).size).toBe(10);
  });
});

describe('browser currency helpers', () => {
  it('detects exact and language-prefix browser locales before falling back to USD', () => {
    vi.stubGlobal('navigator', { language: 'en-GB' });
    expect(detectCurrency()).toBe('GBP');

    vi.stubGlobal('navigator', { language: 'fr-BE' });
    expect(detectCurrency()).toBe('EUR');

    vi.stubGlobal('navigator', { language: 'zz-ZZ' });
    expect(detectCurrency()).toBe('USD');
  });

  it('uses canonical currency storage, migrates legacy storage, and rejects unsupported codes', () => {
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEYS.currency, JSON.stringify('ILS'));
    expect(getCurrencyCode()).toBe('ILS');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.currency)).toBe(JSON.stringify('ILS'));

    setCurrencyCode('EUR');
    expect(getCurrencyCode()).toBe('EUR');

    setCurrencyCode('XYZ');
    expect(getCurrencyCode()).toBe('EUR');
  });
});
