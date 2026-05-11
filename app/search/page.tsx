'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import HotelCard, { CatalogHotel } from '@/components/HotelCard';
import QuickSearchChips from '@/components/QuickSearchChips';
import { CardGridSkeleton } from '@/components/Skeleton';
import { useDebounce } from '@/lib/useDebounce';

type SortOption = 'name-asc' | 'name-desc' | 'city-asc';

function SearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCity = searchParams.get('city') || '';

  const [query, setQuery] = useState(initialCity);
  const [allHotels, setAllHotels] = useState<CatalogHotel[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<SortOption>('name-asc');
  const [activeCountry, setActiveCountry] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 18;

  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/compare', { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setAllHotels(data.hotels || []);
        setCities(data.cities || []);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  // Derived countries from hotels
  const countries = useMemo(
    () => Array.from(new Set(allHotels.map((h) => h.country))).sort(),
    [allHotels]
  );

  const filtered = useMemo(() => {
    setPage(1); // reset page on filter change
    let list = allHotels;
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
      if (sort === 'name-asc') return a.name.localeCompare(b.name);
      if (sort === 'name-desc') return b.name.localeCompare(a.name);
      if (sort === 'city-asc') return a.city.localeCompare(b.city);
      return 0;
    });
  }, [allHotels, debouncedQuery, activeCountry, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('city', query.trim());
    router.push(`/search${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 mb-1">Find a Hotel</h1>
        <p className="text-zinc-500 mb-6">
          {allHotels.length} hotels across {cities.length} cities — compare live prices from 8+ providers
        </p>

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
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            aria-label="Sort hotels"
            className="px-3 py-2 border border-zinc-300 rounded-lg bg-white text-zinc-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="name-asc">Sort: A → Z</option>
            <option value="name-desc">Sort: Z → A</option>
            <option value="city-asc">Sort: City</option>
          </select>

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

        {/* Quick search chips */}
        <QuickSearchChips className="mb-4" />

        {/* Country filter pills */}
        {!loading && (
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
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <CardGridSkeleton count={9} />
        ) : filtered.length === 0 ? (
          <div className="text-center text-zinc-500 py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-lg font-medium">No hotels found for &quot;{query}&quot;</p>
            <p className="text-sm mt-2">Try: {cities.slice(0, 5).join(', ')}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-zinc-500 mb-4">
              Showing{' '}
              <strong>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
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
                  ← Prev
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
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 text-center text-zinc-500">Loading...</div>}>
      <SearchInner />
    </Suspense>
  );
}
