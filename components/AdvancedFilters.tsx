'use client';

import { useState } from 'react';

export interface FilterState {
  priceRange: [number, number];
  rating: number;
  amenities: string[];
  sortBy: 'price' | 'rating' | 'name' | 'popularity';
  sortOrder: 'asc' | 'desc';
}

const DEFAULT_FILTERS: FilterState = {
  priceRange: [0, 500],
  rating: 0,
  amenities: [],
  sortBy: 'price',
  sortOrder: 'asc',
};

const AMENITY_OPTIONS = [
  { key: 'wifi', label: 'Wi-Fi', icon: '📶' },
  { key: 'pool', label: 'Pool', icon: '🏊' },
  { key: 'parking', label: 'Parking', icon: '🅿️' },
  { key: 'gym', label: 'Gym', icon: '💪' },
  { key: 'spa', label: 'Spa', icon: '💆' },
  { key: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { key: 'bar', label: 'Bar', icon: '🍸' },
  { key: 'petFriendly', label: 'Pet Friendly', icon: '🐾' },
  { key: 'beach', label: 'Beach Access', icon: '🏖️' },
  { key: 'breakfast', label: 'Breakfast', icon: '🥐' },
];

interface AdvancedFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  className?: string;
}

export default function AdvancedFilters({
  filters,
  onChange,
  className = '',
}: AdvancedFiltersProps) {
  const [expanded, setExpanded] = useState(false);
  const activeCount =
    (filters.rating > 0 ? 1 : 0) +
    filters.amenities.length +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 500 ? 1 : 0);

  const toggleAmenity = (key: string) => {
    const next = filters.amenities.includes(key)
      ? filters.amenities.filter((a) => a !== key)
      : [...filters.amenities, key];
    onChange({ ...filters, amenities: next });
  };

  const reset = () => onChange(DEFAULT_FILTERS);

  return (
    <div className={className}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition text-sm font-medium text-slate-700"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="bg-blue-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
            {activeCount}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          {/* Price Range */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">💰 Price Range</h4>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block mb-0.5">Min</label>
                <input
                  type="number"
                  min={0}
                  max={filters.priceRange[1]}
                  value={filters.priceRange[0]}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      priceRange: [Number(e.target.value), filters.priceRange[1]],
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-slate-400 mt-4">—</span>
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block mb-0.5">Max</label>
                <input
                  type="number"
                  min={filters.priceRange[0]}
                  value={filters.priceRange[1]}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      priceRange: [filters.priceRange[0], Number(e.target.value)],
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Minimum Rating */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">⭐ Minimum Rating</h4>
            <div className="flex gap-2">
              {[0, 7, 8, 8.5, 9].map((r) => (
                <button
                  key={r}
                  onClick={() => onChange({ ...filters, rating: r })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filters.rating === r
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r === 0 ? 'Any' : `${r}+`}
                </button>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">🏨 Amenities</h4>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => toggleAmenity(a.key)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    filters.amenities.includes(a.key)
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-slate-50 text-slate-600 border border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <span>{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">↕️ Sort By</h4>
            <div className="flex gap-2">
              {[
                { key: 'price', label: 'Price' },
                { key: 'rating', label: 'Rating' },
                { key: 'name', label: 'Name' },
                { key: 'popularity', label: 'Popular' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() =>
                    onChange({
                      ...filters,
                      sortBy: s.key as FilterState['sortBy'],
                      sortOrder:
                        filters.sortBy === s.key
                          ? filters.sortOrder === 'asc'
                            ? 'desc'
                            : 'asc'
                          : 'asc',
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                    filters.sortBy === s.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s.label}
                  {filters.sortBy === s.key && (
                    <span>{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={reset}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition"
            >
              Reset All
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
