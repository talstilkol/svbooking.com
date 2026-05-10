'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationInputRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [error, setError] = useState('');

  useEffect(() => {
    locationInputRef.current?.focus();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setError('Min price cannot be greater than max price');
      return;
    }
    const params = new URLSearchParams();
    if (location.trim()) params.set('city', location.trim());
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-4 flex-wrap items-end">
      <div className="flex-1 min-w-[200px]">
        <label htmlFor="search-location" className="block text-sm font-medium text-slate-600 mb-1">Destination</label>
        <input
          id="search-location"
          ref={locationInputRef}
          type="text"
          placeholder="City or hotel name"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>
      <div className="w-28">
        <label htmlFor="search-min" className="block text-sm font-medium text-slate-600 mb-1">Min $</label>
        <input
          id="search-min"
          type="number"
          min="0"
          placeholder="0"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>
      <div className="w-28">
        <label htmlFor="search-max" className="block text-sm font-medium text-slate-600 mb-1">Max $</label>
        <input
          id="search-max"
          type="number"
          min="0"
          placeholder="999"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>
      <button
        type="submit"
        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
      >
        Search
      </button>
      {error && <p className="w-full text-red-600 text-sm">{error}</p>}
    </form>
  );
}
