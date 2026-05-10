'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import ListingCard from '@/components/ListingCard';

interface Listing {
  _id: string;
  title: string;
  location: string;
  pricePerNight: number;
  rating: number;
  images?: string[];
  description?: string;
}

export default function SearchResults() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams(searchParams).toString();
        const res = await fetch(`/api/listings?${params}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch listings');
        }
        setListings(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch listings');
        setListings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">Search Results</h1>
        <SearchBar />
        {loading ? (
          <div className="mt-8 text-center text-zinc-600 dark:text-zinc-400">Loading...</div>
        ) : error ? (
          <div className="mt-8 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300">
            <strong>Error:</strong> {error}
            <p className="text-sm mt-2">Make sure MongoDB is running locally or set MONGODB_URI in .env.local</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="mt-8 text-center text-zinc-600 dark:text-zinc-400">No listings found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {listings.map((listing) => (
              <ListingCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
