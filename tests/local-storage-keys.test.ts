import { beforeEach, describe, expect, it } from 'vitest';
import {
  getHotelViewsStorageKey,
  getLegacyHotelViewsStorageKey,
  getLegacyTravelChecklistStorageKey,
  getTravelChecklistStorageKey,
  isLocalStorageExportKey,
  LEGACY_LOCAL_STORAGE_KEYS,
  LOCAL_STORAGE_KEYS,
  readLocalStorageJson,
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
    localStorage.setItem(LOCAL_STORAGE_KEYS.newsletter, 'subscribed');
    localStorage.setItem('unrelated', JSON.stringify({ hidden: true }));

    const exported = readLocalStorageExportData();

    expect(exported[checklistKey]).toEqual([{ id: 'passport', checked: true }]);
    expect(exported[LOCAL_STORAGE_KEYS.newsletter]).toBe('subscribed');
    expect(exported.unrelated).toBeUndefined();

    localStorage.clear();
    writeLocalStorageExportData({
      ...exported,
      [LOCAL_STORAGE_KEYS.trips]: undefined,
      unrelated: { hidden: true },
    });

    expect(JSON.parse(localStorage.getItem(checklistKey) || 'null')).toEqual([{ id: 'passport', checked: true }]);
    expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.newsletter) || 'null')).toBe('subscribed');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.trips)).toBeNull();
    expect(localStorage.getItem('unrelated')).toBeNull();
  });

  it('normalizes dynamic storage keys and recognizes exportable prefixes', () => {
    expect(getTravelChecklistStorageKey('Hotel & Spa')).toBe('svbooking:travel-checklist:Hotel%20%26%20Spa');
    expect(getTravelChecklistStorageKey('   ')).toBe('svbooking:travel-checklist:default');
    expect(getTravelChecklistStorageKey()).toBe('svbooking:travel-checklist:default');
    expect(getLegacyTravelChecklistStorageKey()).toBe('travel-checklist-default');
    expect(getHotelViewsStorageKey('')).toBe('svbooking:hotel-views:unknown');
    expect(getLegacyHotelViewsStorageKey('')).toBe('sv-views-unknown');
    expect(isLocalStorageExportKey('svbooking:hotel-views:g1-d1')).toBe(true);
    expect(isLocalStorageExportKey('unrelated:key')).toBe(false);
  });

  it('returns safe fallbacks for malformed JSON and missing string values', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.favorites, 'not-json');

    expect(readLocalStorageJson(LOCAL_STORAGE_KEYS.favorites, [])).toEqual([]);
    expect(readLocalStorageJsonWithFallback(LOCAL_STORAGE_KEYS.favorites, [], [{ hotelKey: 'fallback' }])).toEqual([
      { hotelKey: 'fallback' },
    ]);
    expect(readLocalStorageStringWithFallback(LOCAL_STORAGE_KEYS.currency, [], null)).toBeNull();
  });

  it('reads canonical raw strings and skips empty string fallbacks before using raw legacy values', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.currency, 'EUR');
    expect(readLocalStorageStringWithFallback(LOCAL_STORAGE_KEYS.currency, [], null)).toBe('EUR');

    localStorage.clear();
    localStorage.setItem('empty-json-string', JSON.stringify(''));
    localStorage.setItem('raw-legacy-currency', 'GBP');

    expect(readLocalStorageStringWithFallback(
      LOCAL_STORAGE_KEYS.currency,
      ['empty-json-string', 'raw-legacy-currency'],
      'USD'
    )).toBe('GBP');
    expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.currency) || 'null')).toBe('GBP');

    localStorage.clear();
    localStorage.setItem('object-shaped-legacy-currency', JSON.stringify({ code: 'EUR' }));

    expect(readLocalStorageStringWithFallback(
      LOCAL_STORAGE_KEYS.currency,
      ['object-shaped-legacy-currency'],
      'USD'
    )).toBe('{"code":"EUR"}');
  });

  it('prefers canonical JSON values and migrates JSON string fallbacks', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.favorites, JSON.stringify([{ hotelKey: 'canonical' }]));
    expect(readLocalStorageJsonWithFallback(LOCAL_STORAGE_KEYS.favorites, [LEGACY_LOCAL_STORAGE_KEYS.favorites], [])).toEqual([
      { hotelKey: 'canonical' },
    ]);

    localStorage.clear();
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEYS.currency, JSON.stringify('CHF'));

    expect(readLocalStorageStringWithFallback(
      LOCAL_STORAGE_KEYS.currency,
      [LEGACY_LOCAL_STORAGE_KEYS.currency],
      'USD'
    )).toBe('CHF');
    expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.currency) || 'null')).toBe('CHF');
  });

  it('returns safe fallbacks when localStorage is unavailable or inaccessible', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: undefined,
    });

    expect(readLocalStorageJson(LOCAL_STORAGE_KEYS.favorites, [{ hotelKey: 'fallback' }])).toEqual([
      { hotelKey: 'fallback' },
    ]);
    expect(readLocalStorageExportData()).toEqual({});
    expect(() => writeLocalStorageJson(LOCAL_STORAGE_KEYS.favorites, [])).not.toThrow();
    expect(() => removeLocalStorageKeys([LOCAL_STORAGE_KEYS.favorites])).not.toThrow();

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: Object.defineProperty({}, 'localStorage', {
        get() {
          throw new Error('storage denied');
        },
      }),
    });

    expect(readLocalStorageJson(LOCAL_STORAGE_KEYS.trips, [])).toEqual([]);

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: null },
    });

    expect(readLocalStorageExportData()).toEqual({});

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          length: 1,
          key: () => getTravelChecklistStorageKey('g187147-d188728'),
          getItem: () => null,
        },
      },
    });

    expect(readLocalStorageExportData()).toEqual({});
  });

  it('exports parseable dynamic keys and ignores undefined import values', () => {
    const viewsKey = getHotelViewsStorageKey('g187147-d188728');
    localStorage.setItem(viewsKey, 'not-json');
    localStorage.setItem(getLegacyHotelViewsStorageKey('g187147-d188728'), JSON.stringify({ views: 3 }));

    const exported = readLocalStorageExportData();

    expect(exported[viewsKey]).toBe('not-json');
    expect(exported[getLegacyHotelViewsStorageKey('g187147-d188728')]).toBeUndefined();

    writeLocalStorageExportData({
      [LOCAL_STORAGE_KEYS.locale]: 'he',
      [LOCAL_STORAGE_KEYS.notifications]: undefined,
    });

    expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.locale) || 'null')).toBe('he');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.notifications)).toBeNull();
  });
});
