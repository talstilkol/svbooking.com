export const LOCAL_STORAGE_KEYS = Object.freeze({
  favorites: 'svbooking:favorites',
  trips: 'svbooking:trips',
  recentlyViewed: 'svbooking:recent',
  recentSearches: 'svbooking:recent-searches',
  priceAlerts: 'price-alerts',
  newsletter: 'svbooking:newsletter',
  cookiesAccepted: 'svbooking:cookies-accepted',
  currency: 'svbooking:currency',
  recentlyCompared: 'svbooking:recently-compared',
  compareList: 'sv-compare-list',
  onboardingDismissed: 'sv-onboarding-dismissed',
  accessibilityPreferences: 'svbooking:a11y-prefs',
  hotelHistory: 'svbooking:hotel-history',
  searchHistory: 'svbooking:search-history',
  loyalty: 'sv-loyalty',
  userPreferences: 'sv-user-preferences',
  notifications: 'sv-notifications',
  locale: 'svbooking:locale',
});

export const LOCAL_STORAGE_DYNAMIC_PREFIXES = Object.freeze({
  travelChecklist: 'svbooking:travel-checklist:',
  hotelViews: 'svbooking:hotel-views:',
});

export const LEGACY_LOCAL_STORAGE_KEYS = Object.freeze({
  favorites: 'hotel-favorites',
  trips: 'saved-trips',
  recentlyViewed: 'recently-viewed',
  recentSearches: 'sv-recent-searches',
  recentSearchesUnprefixed: 'recent-searches',
  accessibilityPreferences: 'a11y-prefs',
  currency: 'svbooking-currency',
  hotelHistory: 'hotel_history',
  searchHistory: 'search_history',
});

export const LEGACY_LOCAL_STORAGE_PREFIXES = Object.freeze({
  travelChecklist: 'travel-checklist-',
  hotelViews: 'sv-views-',
});

export const LOCAL_STORAGE_EXPORT_KEYS = Object.freeze([
  LOCAL_STORAGE_KEYS.favorites,
  LOCAL_STORAGE_KEYS.trips,
  LOCAL_STORAGE_KEYS.recentlyViewed,
  LOCAL_STORAGE_KEYS.recentSearches,
  LOCAL_STORAGE_KEYS.priceAlerts,
  LOCAL_STORAGE_KEYS.newsletter,
  LOCAL_STORAGE_KEYS.cookiesAccepted,
  LOCAL_STORAGE_KEYS.currency,
  LOCAL_STORAGE_KEYS.recentlyCompared,
  LOCAL_STORAGE_KEYS.compareList,
  LOCAL_STORAGE_KEYS.onboardingDismissed,
  LOCAL_STORAGE_KEYS.accessibilityPreferences,
  LOCAL_STORAGE_KEYS.hotelHistory,
  LOCAL_STORAGE_KEYS.searchHistory,
  LOCAL_STORAGE_KEYS.loyalty,
  LOCAL_STORAGE_KEYS.userPreferences,
  LOCAL_STORAGE_KEYS.notifications,
  LOCAL_STORAGE_KEYS.locale,
  LEGACY_LOCAL_STORAGE_KEYS.favorites,
  LEGACY_LOCAL_STORAGE_KEYS.trips,
  LEGACY_LOCAL_STORAGE_KEYS.recentlyViewed,
  LEGACY_LOCAL_STORAGE_KEYS.recentSearches,
  LEGACY_LOCAL_STORAGE_KEYS.recentSearchesUnprefixed,
  LEGACY_LOCAL_STORAGE_KEYS.accessibilityPreferences,
  LEGACY_LOCAL_STORAGE_KEYS.currency,
  LEGACY_LOCAL_STORAGE_KEYS.hotelHistory,
  LEGACY_LOCAL_STORAGE_KEYS.searchHistory,
]);

const DYNAMIC_EXPORT_PREFIXES = Object.values(LOCAL_STORAGE_DYNAMIC_PREFIXES);

function normalizeStorageSegment(value: string | undefined, fallback = 'default') {
  const trimmed = String(value || fallback).trim() || fallback;
  return encodeURIComponent(trimmed);
}

function parseStorageValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function parseStoredString(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  const parsed = parseStorageValue(raw);
  if (typeof parsed === 'string') return parsed.length > 0 ? parsed : null;
  return raw;
}

function getBrowserLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage || null;
  } catch {
    return null;
  }
}

export function getTravelChecklistStorageKey(hotelKey?: string) {
  return `${LOCAL_STORAGE_DYNAMIC_PREFIXES.travelChecklist}${normalizeStorageSegment(hotelKey)}`;
}

export function getLegacyTravelChecklistStorageKey(hotelKey?: string) {
  return `${LEGACY_LOCAL_STORAGE_PREFIXES.travelChecklist}${hotelKey || 'default'}`;
}

export function getHotelViewsStorageKey(hotelKey: string) {
  return `${LOCAL_STORAGE_DYNAMIC_PREFIXES.hotelViews}${normalizeStorageSegment(hotelKey, 'unknown')}`;
}

export function getLegacyHotelViewsStorageKey(hotelKey: string) {
  return `${LEGACY_LOCAL_STORAGE_PREFIXES.hotelViews}${hotelKey || 'unknown'}`;
}

export function isLocalStorageExportKey(key: string) {
  return (LOCAL_STORAGE_EXPORT_KEYS as readonly string[]).includes(key) ||
    DYNAMIC_EXPORT_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function readLocalStorageJson<T>(key: string, fallback: T): T {
  const storage = getBrowserLocalStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function readLocalStorageJsonWithFallback<T>(
  key: string,
  fallbackKeys: readonly string[],
  fallback: T
): T {
  const canonical = readLocalStorageJson<T | null>(key, null);
  if (canonical !== null) return canonical;

  for (const fallbackKey of fallbackKeys) {
    const value = readLocalStorageJson<T | null>(fallbackKey, null);
    if (value === null) continue;
    try {
      const storage = getBrowserLocalStorage();
      storage?.setItem(key, JSON.stringify(value));
    } catch {}
    return value;
  }

  return fallback;
}

export function readLocalStorageStringWithFallback(
  key: string,
  fallbackKeys: readonly string[],
  fallback: string | null
): string | null {
  const storage = getBrowserLocalStorage();
  const canonical = readLocalStorageJson<string | null>(key, null);
  if (typeof canonical === 'string' && canonical.length > 0) return canonical;

  try {
    const raw = storage?.getItem(key);
    const rawValue = parseStoredString(raw);
    if (rawValue) return rawValue;
  } catch {}

  for (const fallbackKey of fallbackKeys) {
    const value = readLocalStorageJson<string | null>(fallbackKey, null);
    const rawValue = typeof value === 'string' && value.length > 0 ? value : null;
    if (rawValue !== null) {
      writeLocalStorageJson(key, rawValue);
      return rawValue;
    }

    try {
      const raw = storage?.getItem(fallbackKey);
      const parsedRaw = parseStoredString(raw);
      if (parsedRaw) {
        writeLocalStorageJson(key, parsedRaw);
        return parsedRaw;
      }
    } catch {}
  }

  return fallback;
}

export function writeLocalStorageJson(key: string, value: unknown) {
  const storage = getBrowserLocalStorage();
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function readLocalStorageExportData() {
  const data: Record<string, unknown> = {};
  const storage = getBrowserLocalStorage();
  if (!storage) return data;

  for (const key of LOCAL_STORAGE_EXPORT_KEYS) {
    try {
      const raw = storage.getItem(key);
      if (raw !== null) data[key] = parseStorageValue(raw);
    } catch {}
  }

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key || data[key] !== undefined || !isLocalStorageExportKey(key)) continue;
      const raw = storage.getItem(key);
      if (raw !== null) data[key] = parseStorageValue(raw);
    }
  } catch {}

  return data;
}

export function writeLocalStorageExportData(localData: Record<string, unknown>) {
  const entries = Object.entries(localData);
  for (const [key, value] of entries) {
    if (!isLocalStorageExportKey(key) || value === undefined) continue;
    writeLocalStorageJson(key, value);
  }
}

export function removeLocalStorageKeys(keys: readonly string[]) {
  const storage = getBrowserLocalStorage();
  if (!storage) return;

  for (const key of keys) {
    try {
      storage.removeItem(key);
    } catch {}
  }
}
