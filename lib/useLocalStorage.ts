'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { hashId } from '@/lib/utils/hashId';
import {
  LEGACY_LOCAL_STORAGE_KEYS,
  LOCAL_STORAGE_KEYS,
  readLocalStorageJsonWithFallback,
  writeLocalStorageJson,
} from '@/lib/local-storage-keys';

export function useLocalStorage<T>(key: string, initial: T, fallbackKeys: readonly string[] = []) {
  const initialRef = useRef(initial);
  const fallbackKeySignature = fallbackKeys.join('\u0000');
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const fallbackKeyList = fallbackKeySignature ? fallbackKeySignature.split('\u0000') : [];
      setValue(readLocalStorageJsonWithFallback(key, fallbackKeyList, initialRef.current));
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [key, fallbackKeySignature]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        writeLocalStorageJson(key, v);
        return v;
      });
    },
    [key]
  );

  return [value, update, hydrated] as const;
}

export interface FavoriteHotel {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  image: string;
  addedAt: string;
}

export interface SavedTrip {
  id: string;
  hotelKey: string;
  hotelName: string;
  city: string;
  country: string;
  image: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  notes?: string;
  createdAt: string;
}

async function createFavoriteInCloud(favorite: FavoriteHotel) {
  try {
    await fetch('/api/me/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(favorite),
    });
  } catch {
    // cloud sync is best-effort
  }
}

async function deleteFavoriteFromCloud(hotelKey: string) {
  try {
    const params = new URLSearchParams({ hotelKey });
    await fetch(`/api/me/favorites?${params}`, { method: 'DELETE' });
  } catch {
    // cloud sync is best-effort
  }
}

async function createTripInCloud(trip: SavedTrip) {
  try {
    await fetch('/api/me/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trip),
    });
  } catch {
    // cloud sync is best-effort
  }
}

async function deleteTripFromCloud(id: string) {
  try {
    const params = new URLSearchParams({ id });
    await fetch(`/api/me/trips?${params}`, { method: 'DELETE' });
  } catch {
    // cloud sync is best-effort
  }
}

export function useFavorites() {
  const [favorites, setFavorites, hydrated] = useLocalStorage<FavoriteHotel[]>(
    LOCAL_STORAGE_KEYS.favorites,
    [],
    [LEGACY_LOCAL_STORAGE_KEYS.favorites]
  );

  const isFavorite = (hotelKey: string) => favorites.some((f) => f.hotelKey === hotelKey);

  const toggleFavorite = async (hotel: Omit<FavoriteHotel, 'addedAt'>) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.hotelKey === hotel.hotelKey);
      if (exists) {
        const next = prev.filter((f) => f.hotelKey !== hotel.hotelKey);
        void deleteFavoriteFromCloud(hotel.hotelKey);
        return next;
      }
      const favorite = { ...hotel, addedAt: new Date().toISOString() };
      const next = [...prev, favorite];
      void createFavoriteInCloud(favorite);
      return next;
    });
  };

  const removeFavorite = (hotelKey: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.hotelKey !== hotelKey);
      void deleteFavoriteFromCloud(hotelKey);
      return next;
    });
  };

  return { favorites, isFavorite, toggleFavorite, removeFavorite, hydrated };
}

export function useTrips() {
  const [trips, setTrips, hydrated] = useLocalStorage<SavedTrip[]>(
    LOCAL_STORAGE_KEYS.trips,
    [],
    [LEGACY_LOCAL_STORAGE_KEYS.trips]
  );

  const addTrip = (trip: Omit<SavedTrip, 'id' | 'createdAt'>) => {
    const createdAt = new Date().toISOString();
    const newTrip: SavedTrip = {
      ...trip,
      id: hashId('trip', trip.hotelKey, trip.checkIn, trip.checkOut, trip.guests, trip.notes ?? ''),
      createdAt,
    };
    setTrips((prev) => [newTrip, ...prev]);
    void createTripInCloud(newTrip);
    return newTrip;
  };

  const removeTrip = (id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
    void deleteTripFromCloud(id);
  };

  return { trips, addTrip, removeTrip, hydrated };
}

export interface RecentlyViewedHotel {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  image: string;
  viewedAt: string;
}

export function useRecentlyViewed() {
  const [items, setItems, hydrated] = useLocalStorage<RecentlyViewedHotel[]>(
    LOCAL_STORAGE_KEYS.recentlyViewed,
    [],
    [LEGACY_LOCAL_STORAGE_KEYS.recentlyViewed]
  );

  const addRecentlyViewed = useCallback(
    (hotel: Omit<RecentlyViewedHotel, 'viewedAt'>) => {
      setItems((prev) => {
        const filtered = prev.filter((h) => h.hotelKey !== hotel.hotelKey);
        return [{ ...hotel, viewedAt: new Date().toISOString() }, ...filtered].slice(0, 10);
      });
    },
    [setItems]
  );

  return { items, addRecentlyViewed, hydrated };
}
