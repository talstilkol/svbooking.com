'use client';

import Link from 'next/link';
import { useFavorites } from '@/lib/useLocalStorage';

export default function FavoritesPage() {
  const { favorites, removeFavorite, hydrated } = useFavorites();

  if (!hydrated) {
    return <div className="min-h-screen p-8 text-center text-zinc-600">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">My Favorite Hotels</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Saved locally on your device · {favorites.length} hotel{favorites.length !== 1 ? 's' : ''}
        </p>

        {favorites.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-12 text-center border border-zinc-200 dark:border-zinc-800">
            <div className="text-5xl mb-4">♡</div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">No favorites yet</p>
            <Link href="/search" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Browse hotels
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fav) => (
              <div
                key={fav.hotelKey}
                className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 overflow-hidden"
              >
                <img src={fav.image} alt={fav.name} className="w-full h-48 object-cover" />
                <div className="p-5">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{fav.name}</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                    {fav.city}, {fav.country}
                  </p>
                  <p className="text-xs text-zinc-400 mb-4">
                    Added {new Date(fav.addedAt).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href={`/compare?hotelKey=${fav.hotelKey}`}
                      className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Compare
                    </Link>
                    <Link
                      href={`/trips?hotelKey=${fav.hotelKey}`}
                      className="flex-1 text-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      Plan
                    </Link>
                    <button
                      onClick={() => removeFavorite(fav.hotelKey)}
                      className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
