'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import HotelCard, { CatalogHotel } from '@/components/HotelCard';
import QuickSearchChips from '@/components/QuickSearchChips';
import MapView from '@/components/MapView';
import FilterDrawer from '@/components/FilterDrawer';
import RecentSearches, { addRecentSearch } from '@/components/RecentSearches';
import SearchSuggestions from '@/components/SearchSuggestions';
import { CardGridSkeleton } from '@/components/Skeleton';
import SearchFilters, { type FilterOptions } from '@/components/SearchFilters';
import EmptyState from '@/components/EmptyState';
import { useDebounce } from '@/lib/useDebounce';

type SortOption = 'name-asc' | 'name-desc' | 'city-asc';
type ViewMode = 'grid' | 'map';

const DEFAULT_SORT: SortOption = 'name-asc';
const DEFAULT_FILTERS: FilterOptions = { stars: [], priceRange: [0, 1000], amenities: [], sort: DEFAULT_SORT };

interface SearchClientProps {
  hotels: CatalogHotel[];
  cities: string[];
  initialCity?: string;
}

function SearchInner({ hotels, cities, initialCity = '' }: SearchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cityParam = searchParams.get('city') || initialCity;

  const [query, setQuery] = useState(cityParam);
  const [activeCountry, setActiveCountry] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const PAGE_SIZE = 18;

  const debouncedQuery = useDebounce(query, 200);
  const activeSort = (filters.sort || DEFAULT_SORT) as SortOption;

  // Derived countries from hotels
  const countries = useMemo(
    () => Array.from(new Set(hotels.map((h) => h.country))).sort(),
    [hotels]
  );

  const filtered = useMemo(() => {
    let list = hotels;
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.city.toLowerCase().includes(q) ||
          h.country.toLowerCase().includes(q)
      );
    }
    if (activeCountry) {
      list = list.filter((h) => h.country === activeCountry);
    }
    return [...list].sort((a, b) => {
      if (activeSort === 'name-asc') return a.name.localeCompare(b.name);
      if (activeSort === 'name-desc') return b.name.localeCompare(a.name);
      if (activeSort === 'city-asc') return a.city.localeCompare(b.city);
      return 0;
    });
  }, [hotels, debouncedQuery, activeCountry, activeSort]);

  // Reset page when filters change
  useEffect(() => {
    queueMicrotask(() => setPage(1));
  }, [debouncedQuery, activeCountry, activeSort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('city', query.trim());
      addRecentSearch(query.trim(), filtered.length);
    }
    router.push(`/search${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <div className="min-h-screen">
      {/* Gradient header */}
      <div className="bg-linear-to-r from-slate-700 via-slate-800 to-slate-900 text-white py-10 px-4 mb-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-1">Find a Hotel</h1>
          <p className="text-white/70">
            {hotels.length} hotels across {cities.length} cities — compare provider-returned prices when available
          </p>
        </div>
      </div>
      <div className="px-4 pb-6">
      <div className="max-w-7xl mx-auto">

        {/* Search + Sort bar */}
        <form onSubmit={handleSearch} className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200 mb-4 flex gap-3 flex-wrap items-center">
          <div className="flex-1 min-w-[220px] relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              list="cities-list"
              type="text"
              aria-label="Search hotels or cities"
              placeholder="Hotel name, city, or country..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <datalist id="cities-list">
              {cities.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <select
            value={activeSort}
            onChange={(e) => setFilters((current) => ({ ...current, sort: e.target.value as SortOption }))}
            aria-label="Sort hotels"
            className="px-3 py-2 border border-zinc-300 rounded-lg bg-white text-zinc-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="name-asc">Sort: A &rarr; Z</option>
            <option value="name-desc">Sort: Z &rarr; A</option>
            <option value="city-asc">Sort: City</option>
          </select>

          <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm font-medium transition ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
              aria-label="Grid view"
            >
              &#9638;
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-3 py-2 text-sm font-medium transition ${
                viewMode === 'map' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
              aria-label="Map view"
            >
              &#128506;
            </button>
          </div>

          <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Search
          </button>
          {(query || activeCountry) && (
            <button type="button" onClick={() => { setQuery(''); setActiveCountry(''); }}
              className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200 text-sm">
              Clear
            </button>
          )}
        </form>

        {/* Advanced filters */}
        <SearchFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClear={() => setFilters(DEFAULT_FILTERS)}
          isOpen={filtersOpen}
          onToggle={() => setFiltersOpen(!filtersOpen)}
          resultCount={filtered.length}
        />

        {/* Recent searches */}
        <RecentSearches className="mb-4" />

        {/* Search suggestions */}
        <SearchSuggestions currentCity={debouncedQuery} className="mb-4" />

        {/* Quick search chips */}
        <QuickSearchChips className="mb-4" />

        {/* Mobile filter drawer */}
        <FilterDrawer
          countries={countries}
          activeCountry={activeCountry}
          onCountryChange={setActiveCountry}
          sortOptions={[
            { label: 'A → Z', value: 'name-asc' },
            { label: 'Z → A', value: 'name-desc' },
            { label: 'By City', value: 'city-asc' },
          ]}
          activeSort={activeSort}
          onSortChange={(s) => setFilters((current) => ({ ...current, sort: s as SortOption }))}
          resultCount={filtered.length}
          className="mb-4"
        />

        {/* Country filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveCountry('')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !activeCountry ? 'bg-blue-600 text-white' : 'bg-white text-zinc-600 border border-zinc-200 hover:border-blue-300'
            }`}
          >
            All countries
          </button>
          {countries.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCountry(c === activeCountry ? '' : c)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCountry === c ? 'bg-blue-600 text-white' : 'bg-white text-zinc-600 border border-zinc-200 hover:border-blue-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="&#128269;"
            title={`No hotels found for "${query}"`}
            description={`Try searching for: ${cities.slice(0, 5).join(', ')}`}
            action={{ label: 'Browse all hotels', href: '/search' }}
          />
        ) : viewMode === 'map' ? (
          <MapView
            hotels={filtered}
            selectedCity={activeCountry ? undefined : query || undefined}
            onCitySelect={(city) => setQuery(city)}
          />
        ) : (
          <>
            <p className="text-sm text-zinc-500 mb-4">
              Showing{' '}
              <strong>
                {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, filtered.length)}
              </strong>{' '}
              of <strong>{filtered.length}</strong> hotels
              {activeCountry && ` in ${activeCountry}`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((hotel) => (
                <HotelCard key={hotel.hotelKey} hotel={hotel} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border border-zinc-300 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-zinc-50 transition"
                >
                  &larr; Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                      p === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white border border-zinc-300 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-zinc-50 transition"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}

export default function SearchClient({ hotels, cities, initialCity }: SearchClientProps) {
  return (
    <Suspense fallback={<CardGridSkeleton count={9} />}>
      <SearchInner hotels={hotels} cities={cities} initialCity={initialCity} />
    </Suspense>
  );
}
