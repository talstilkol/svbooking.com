import { beforeEach, describe, expect, it } from 'vitest';
import {
  getTravelChecklistStorageKey,
  LEGACY_LOCAL_STORAGE_KEYS,
  LOCAL_STORAGE_KEYS,
  readLocalStorageExportData,
  readLocalStorageJsonWithFallback,
  readLocalStorageStringWithFallback,
  removeLocalStorageKeys,
  writeLocalStorageExportData,
  writeLocalStorageJson,
} from '@/lib/local-storage-keys';

function installLocalStorageStub() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
  };

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: storage },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

describe('local storage key helpers', () => {
  beforeEach(() => {
    installLocalStorageStub();
  });

  it('reads legacy favorites and migrates them to the canonical key', () => {
    const favorite = [{ hotelKey: 'g1-d1', name: 'Verified Hotel' }];
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEYS.favorites, JSON.stringify(favorite));

    const value = readLocalStorageJsonWithFallback(
      LOCAL_STORAGE_KEYS.favorites,
      [LEGACY_LOCAL_STORAGE_KEYS.favorites],
      []
    );

    expect(value).toEqual(favorite);
    expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.favorites) || 'null')).toEqual(favorite);
  });

  it('writes and removes centralized keys without touching unrelated values', () => {
    writeLocalStorageJson(LOCAL_STORAGE_KEYS.trips, [{ id: 'h_trip' }]);
    localStorage.setItem('unrelated', 'kept');

    removeLocalStorageKeys([LOCAL_STORAGE_KEYS.trips]);

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.trips)).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('kept');
  });

  it('reads raw legacy string values and migrates them to JSON canonical storage', () => {
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEYS.currency, 'ILS');

    const value = readLocalStorageStringWithFallback(
      LOCAL_STORAGE_KEYS.currency,
      [LEGACY_LOCAL_STORAGE_KEYS.currency],
      null
    );

    expect(value).toBe('ILS');
    expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.currency) || 'null')).toBe('ILS');
  });

  it('exports and imports canonical dynamic storage keys only', () => {
    const checklistKey = getTravelChecklistStorageKey('g1-d1');
    localStorage.setItem(checklistKey, JSON.stringify([{ id: 'passport', checked: true }]));
    localStorage.setItem('unrelated', JSON.stringify({ hidden: true }));

    const exported = readLocalStorageExportData();

    expect(exported[checklistKey]).toEqual([{ id: 'passport', checked: true }]);
    expect(exported.unrelated).toBeUndefined();

    localStorage.clear();
    writeLocalStorageExportData(exported);

    expect(JSON.parse(localStorage.getItem(checklistKey) || 'null')).toEqual([{ id: 'passport', checked: true }]);
    expect(localStorage.getItem('unrelated')).toBeNull();
  });
});
