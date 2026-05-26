'use client';

import { useState, useEffect, useRef } from 'react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterDrawerProps {
  countries: string[];
  activeCountry: string;
  onCountryChange: (country: string) => void;
  priceRange?: [number, number];
  onPriceChange?: (range: [number, number]) => void;
  sortOptions?: FilterOption[];
  activeSort?: string;
  onSortChange?: (sort: string) => void;
  resultCount?: number;
  className?: string;
}

export default function FilterDrawer({
  countries,
  activeCountry,
  onCountryChange,
  sortOptions = [],
  activeSort = '',
  onSortChange,
  resultCount = 0,
  className = '',
}: FilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const activeFilters = [activeCountry].filter(Boolean).length;

  return (
    <div className={`md:hidden ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm w-full justify-center"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filters
        {activeFilters > 0 && (
          <span className="bg-blue-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {activeFilters}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-300 max-h-[85vh] overflow-y-auto ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-800">Filters</h2>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-600 text-xl"
              aria-label="Close filters"
            >
              ✕
            </button>
          </div>

          {/* Sort */}
          {sortOptions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Sort by</h3>
              <div className="grid grid-cols-2 gap-2">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onSortChange?.(opt.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      activeSort === opt.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Country filter */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Country</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onCountryChange('')}
                className={`px-3 py-1.5 rounded-full text-sm transition ${
                  !activeCountry
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                All
              </button>
              {countries.map((c) => (
                <button
                  key={c}
                  onClick={() => onCountryChange(c === activeCountry ? '' : c)}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${
                    activeCountry === c
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Apply / Results */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => {
                onCountryChange('');
                onSortChange?.('name-asc');
              }}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              Show {resultCount} hotels
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
