'use client';

import { useState, useEffect } from 'react';

interface Stats {
  favorites: number;
  trips: number;
  searches: number;
  comparisons: number;
  reviews: number;
  alerts: number;
  totalSaved: number;
  daysActive: number;
}

export default function DashboardStats({ className = '' }: { className?: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('hotel-favorites') || '[]');
      const trips = JSON.parse(localStorage.getItem('saved-trips') || '[]');
      const recent = JSON.parse(localStorage.getItem('recently-viewed') || '[]');
      const searches = JSON.parse(localStorage.getItem('sv-recent-searches') || '[]');
      const reviews = JSON.parse(localStorage.getItem('sv-user-reviews') || '[]');
      const alerts = JSON.parse(localStorage.getItem('price-alerts') || '[]');
      const loyalty = JSON.parse(localStorage.getItem('sv-loyalty') || '{"points":0}');

      setStats({
        favorites: favs.length,
        trips: trips.length,
        searches: searches.length,
        comparisons: recent.length,
        reviews: reviews.length,
        alerts: alerts.length,
        totalSaved: loyalty.points || 0,
        daysActive: Math.max(1, Math.floor((Date.now() - (loyalty.firstVisit || Date.now())) / 86400000)),
      });
    } catch {
      setStats({
        favorites: 0, trips: 0, searches: 0, comparisons: 0,
        reviews: 0, alerts: 0, totalSaved: 0, daysActive: 1,
      });
    }
  }, []);

  if (!stats) return null;

  const cards = [
    { icon: '❤️', label: 'Favorites', value: stats.favorites, color: 'from-red-500 to-pink-600' },
    { icon: '✈️', label: 'Trips Planned', value: stats.trips, color: 'from-blue-500 to-blue-600' },
    { icon: '🔍', label: 'Searches', value: stats.searches, color: 'from-green-500 to-emerald-600' },
    { icon: '📊', label: 'Comparisons', value: stats.comparisons, color: 'from-purple-500 to-indigo-600' },
    { icon: '✍️', label: 'Reviews', value: stats.reviews, color: 'from-amber-500 to-orange-600' },
    { icon: '🔔', label: 'Price Alerts', value: stats.alerts, color: 'from-cyan-500 to-blue-600' },
  ];

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl p-4 text-white"
          >
            <div className={`absolute inset-0 bg-linear-to-br ${card.color}`} />
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-4 translate-x-4" />
            <div className="relative">
              <span className="text-2xl block mb-1">{card.icon}</span>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-[10px] opacity-80">{card.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
