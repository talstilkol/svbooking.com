'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw));
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(v));
        } catch {
          // ignore quota errors
        }
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

async function syncToCloud(type: 'favorites' | 'trips', data: unknown) {
  try {
    await fetch(`/api/me/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // cloud sync is best-effort
  }
}

export function useFavorites() {
  const [favorites, setFavorites, hydrated] = useLocalStorage<FavoriteHotel[]>('svbooking:favorites', []);

  const isFavorite = (hotelKey: string) => favorites.some((f) => f.hotelKey === hotelKey);

  const toggleFavorite = async (hotel: Omit<FavoriteHotel, 'addedAt'>) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.hotelKey === hotel.hotelKey);
      if (exists) {
        const next = prev.filter((f) => f.hotelKey !== hotel.hotelKey);
        syncToCloud('favorites', next);
        return next;
      }
      const next = [...prev, { ...hotel, addedAt: new Date().toISOString() }];
      syncToCloud('favorites', next);
      return next;
    });
  };

  const removeFavorite = (hotelKey: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.hotelKey !== hotelKey);
      syncToCloud('favorites', next);
      return next;
    });
  };

  return { favorites, isFavorite, toggleFavorite, removeFavorite, hydrated };
}

export function useTrips() {
  const [trips, setTrips, hydrated] = useLocalStorage<SavedTrip[]>('svbooking:trips', []);

  const addTrip = (trip: Omit<SavedTrip, 'id' | 'createdAt'>) => {
    const newTrip: SavedTrip = {
      ...trip,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    setTrips((prev) => [newTrip, ...prev]);
    return newTrip;
  };

  const removeTrip = (id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
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
  const [items, setItems, hydrated] = useLocalStorage<RecentlyViewedHotel[]>('svbooking:recent', []);

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
