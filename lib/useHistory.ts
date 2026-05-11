'use client';

import { useState, useEffect } from 'react';

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
    // Load from localStorage on mount
    const savedHistory = localStorage.getItem('hotel_history');
    const savedSearchHistory = localStorage.getItem('search_history');

    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history:', e);
      }
    }

    if (savedSearchHistory) {
      try {
        setSearchHistory(JSON.parse(savedSearchHistory));
      } catch (e) {
        console.error('Failed to parse search history:', e);
      }
    }
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
      localStorage.setItem('hotel_history', JSON.stringify(updated));
      
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
      localStorage.setItem('search_history', JSON.stringify(updated));
      
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('hotel_history');
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('search_history');
  };

  const removeFromHistory = (hotelKey: string) => {
    setHistory((prev) => {
      const updated = prev.filter((h) => h.hotelKey !== hotelKey);
      localStorage.setItem('hotel_history', JSON.stringify(updated));
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
