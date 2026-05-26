'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useDebounce } from '@/lib/useDebounce';

interface HotelResult {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  image: string;
}

interface SearchResults {
  cities: string[];
  hotels: HotelResult[];
}

export default function SearchAutocomplete() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ cities: [], hotels: [] });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 220);
  const listboxId = 'search-autocomplete-results';

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      queueMicrotask(() => {
        setResults({ cities: [], hotels: [] });
        setOpen(false);
      });
      return;
    }
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setLoading(true);
    });
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setResults(data);
        setOpen(data.cities.length > 0 || data.hotels.length > 0);
        setActiveIndex(-1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedQuery]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allItems = useMemo(() => [
    ...results.cities.map((c) => ({ type: 'city' as const, value: c })),
    ...results.hotels.map((h) => ({ type: 'hotel' as const, value: h })),
  ], [results.cities, results.hotels]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0) {
          const item = allItems[activeIndex];
          if (item.type === 'city') {
            router.push(`/search?city=${encodeURIComponent(item.value)}`);
          } else {
            router.push(`/compare?hotelKey=${item.value.hotelKey}`);
          }
          setOpen(false);
        } else if (query.trim()) {
          router.push(`/search?city=${encodeURIComponent(query.trim())}`);
          setOpen(false);
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    },
    [open, activeIndex, allItems, query, router]
  );

  const selectCity = (city: string) => {
    setQuery(city);
    setOpen(false);
    router.push(`/search?city=${encodeURIComponent(city)}`);
  };

  const selectHotel = (hotel: HotelResult) => {
    setQuery(hotel.name);
    setOpen(false);
    router.push(`/compare?hotelKey=${hotel.hotelKey}`);
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 bg-white rounded-xl border-2 border-slate-200 focus-within:border-blue-500 transition-colors px-4 py-3 shadow-sm">
        <svg className="w-5 h-5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Search for a hotel or city"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          placeholder="Search hotel or city..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.cities.length || results.hotels.length) setOpen(true); }}
          onKeyDown={handleKeyDown}
          className="flex-1 outline-none text-slate-900 placeholder:text-slate-500 bg-transparent text-base"
        />
        {loading && (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        {query && !loading && (
          <button onClick={() => { setQuery(''); setOpen(false); }} aria-label="Clear search"
            className="text-slate-500 hover:text-slate-600 shrink-0">
            ✕
          </button>
        )}
      </div>

      {open && (
        <div
          id={listboxId}
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden max-h-96 overflow-y-auto"
          role="listbox"
        >
          {results.cities.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                Cities
              </div>
              {results.cities.map((city, i) => (
                <button
                  key={city}
                  role="option"
                  aria-selected={activeIndex === i}
                  onClick={() => selectCity(city)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors ${
                    activeIndex === i ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-xl">📍</span>
                  <div>
                    <div className="font-medium text-slate-900">{city}</div>
                    <div className="text-xs text-slate-500">Browse all hotels</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.hotels.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                Hotels
              </div>
              {results.hotels.map((hotel, i) => {
                const idx = results.cities.length + i;
                return (
                  <button
                    key={hotel.hotelKey}
                    role="option"
                    aria-selected={activeIndex === idx}
                    onClick={() => selectHotel(hotel)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors ${
                      activeIndex === idx ? 'bg-blue-50' : ''
                    }`}
                  >
                    <Image
                      src={hotel.image}
                      alt={hotel.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{hotel.name}</div>
                      <div className="text-xs text-slate-500">{hotel.city}, {hotel.country}</div>
                    </div>
                    <span className="ml-auto text-xs text-blue-600 font-medium shrink-0">Compare →</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
