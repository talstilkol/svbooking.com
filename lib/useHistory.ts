'use client';

import { useState, useEffect } from 'react';
import {
  LEGACY_LOCAL_STORAGE_KEYS,
  LOCAL_STORAGE_KEYS,
  readLocalStorageJsonWithFallback,
  removeLocalStorageKeys,
  writeLocalStorageJson,
} from '@/lib/local-storage-keys';

export interface HistoryItem {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  image: string;
  timestamp: number;
}

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

const MAX_HISTORY_ITEMS = 10;
const MAX_SEARCH_HISTORY = 5;

/**
 * Hook for managing recently viewed hotels
 */
export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      setHistory(readLocalStorageJsonWithFallback<HistoryItem[]>(
        LOCAL_STORAGE_KEYS.hotelHistory,
        [LEGACY_LOCAL_STORAGE_KEYS.hotelHistory],
        []
      ));
      setSearchHistory(readLocalStorageJsonWithFallback<SearchHistoryItem[]>(
        LOCAL_STORAGE_KEYS.searchHistory,
        [LEGACY_LOCAL_STORAGE_KEYS.searchHistory],
        []
      ));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const addToHistory = (item: Omit<HistoryItem, 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      // Remove if already exists
      const filtered = prev.filter((h) => h.hotelKey !== newItem.hotelKey);
      // Add to front
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      
      // Save to localStorage
      writeLocalStorageJson(LOCAL_STORAGE_KEYS.hotelHistory, updated);
      
      return updated;
    });
  };

  const addToSearchHistory = (query: string) => {
    if (!query.trim()) return;

    const newItem: SearchHistoryItem = {
      query: query.trim(),
      timestamp: Date.now(),
    };

    setSearchHistory((prev) => {
      // Remove if already exists
      const filtered = prev.filter((s) => s.query.toLowerCase() !== newItem.query.toLowerCase());
      // Add to front
      const updated = [newItem, ...filtered].slice(0, MAX_SEARCH_HISTORY);
      
      // Save to localStorage
      writeLocalStorageJson(LOCAL_STORAGE_KEYS.searchHistory, updated);
      
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    removeLocalStorageKeys([LOCAL_STORAGE_KEYS.hotelHistory, LEGACY_LOCAL_STORAGE_KEYS.hotelHistory]);
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    removeLocalStorageKeys([LOCAL_STORAGE_KEYS.searchHistory, LEGACY_LOCAL_STORAGE_KEYS.searchHistory]);
  };

  const removeFromHistory = (hotelKey: string) => {
    setHistory((prev) => {
      const updated = prev.filter((h) => h.hotelKey !== hotelKey);
      writeLocalStorageJson(LOCAL_STORAGE_KEYS.hotelHistory, updated);
      return updated;
    });
  };

  return {
    history,
    searchHistory,
    addToHistory,
    addToSearchHistory,
    clearHistory,
    clearSearchHistory,
    removeFromHistory,
  };
}
