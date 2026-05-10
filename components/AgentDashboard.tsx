'use client';

import { useState, useEffect } from 'react';
import { useFavorites, useTrips } from '@/lib/useLocalStorage';
import DealCard from './DealCard';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'error';
  checkedAt: string;
  checks: Record<string, { ok: boolean; latencyMs: number; error?: string }>;
  suggestions: string[];
}

interface TopDeal {
  hotel: { hotelKey: string; name: string; city: string; country: string; image: string };
  checkIn: string;
  checkOut: string;
  price: number;
  pricePerNight: number;
  provider: string;
  urgency: string;
  savingsPct: number;
}

interface Recommendation {
  type: string;
  title: string;
  description: string;
  hotel: { hotelKey: string; name: string; city: string; country: string; image: string };
  action: { label: string; href: string };
  priority: string;
}

export default function AgentDashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [topDeals, setTopDeals] = useState<TopDeal[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState({ health: false, deals: false, recs: false });
  const { favorites } = useFavorites();
  const { trips } = useTrips();

  const fetchHealth = async () => {
    setLoading((l) => ({ ...l, health: true }));
    try {
      const res = await fetch('/api/agents/health-check');
      const data = await res.json();
      setHealth(data);
    } catch { setHealth(null); }
    setLoading((l) => ({ ...l, health: false }));
  };

  const fetchDeals = async () => {
    setLoading((l) => ({ ...l, deals: true }));
    try {
      const res = await fetch('/api/agents/deals?limit=6');
      const data = await res.json();
      setTopDeals(data.topDeals || []);
    } catch { setTopDeals([]); }
    setLoading((l) => ({ ...l, deals: false }));
  };

  const fetchRecommendations = async () => {
    if (favorites.length === 0 && trips.length === 0) return;
    setLoading((l) => ({ ...l, recs: true }));
    try {
      const res = await fetch('/api/agents/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites, trips }),
      });
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch { setRecommendations([]); }
    setLoading((l) => ({ ...l, recs: false }));
  };

  useEffect(() => {
    fetchHealth();
    fetchDeals();
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [favorites.length, trips.length]);

  const statusColor = health?.status === 'healthy' ? 'bg-emerald-500' : health?.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-8">
      {/* Health Status */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${statusColor} ${!health ? 'animate-pulse' : ''}`} />
            <h3 className="font-semibold text-zinc-900 dark:text-white">System Health</h3>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading.health}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {loading.health ? 'Checking...' : 'Refresh'}
          </button>
        </div>
        {health && (
          <div className="space-y-2">
            {Object.entries(health.checks).map(([key, check]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">{key}</span>
                <span className={check.ok ? 'text-emerald-600' : 'text-red-500'}>
                  {check.ok ? `OK${check.latencyMs ? ` (${check.latencyMs}ms)` : ''}` : check.error || 'Failed'}
                </span>
              </div>
            ))}
            {health.suggestions.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded text-sm text-amber-800 dark:text-amber-200">
                {health.suggestions.map((s, i) => <p key={i}>{s}</p>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top Deals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Top Deals Found</h3>
          <button
            onClick={fetchDeals}
            disabled={loading.deals}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {loading.deals ? 'Scanning...' : 'Scan Again'}
          </button>
        </div>
        {loading.deals ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-500 mt-2">Scanning hotels for deals...</p>
          </div>
        ) : topDeals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topDeals.map((deal, i) => (
              <DealCard
                key={i}
                deal={{
                  hotel: deal.hotel,
                  bestPrice: deal.price,
                  pricePerNight: deal.pricePerNight,
                  bestProvider: deal.provider,
                  checkIn: deal.checkIn,
                  checkOut: deal.checkOut,
                  nights: 2,
                  currency: 'USD',
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-center py-4">No deals scanned yet.</p>
        )}
      </div>

      {/* Personalized Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
            Personalized Recommendations
          </h3>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
              >
                <img
                  src={rec.hotel.image}
                  alt={rec.hotel.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                      rec.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                      'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {rec.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="font-medium text-zinc-900 dark:text-white text-sm mt-1">{rec.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">{rec.description}</p>
                </div>
                <a
                  href={rec.action.href}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                  {rec.action.label}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {favorites.length === 0 && trips.length === 0 && (
        <div className="text-center py-6 text-zinc-500">
          <p>Add favorites or save trips to get personalized recommendations.</p>
        </div>
      )}
    </div>
  );
}
