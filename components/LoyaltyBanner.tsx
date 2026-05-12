'use client';

import { useState, useEffect } from 'react';

interface LoyaltyBannerProps {
  className?: string;
}

interface LoyaltyState {
  points: number;
  level: string;
  nextLevel: string;
  pointsToNext: number;
  searches: number;
  comparisons: number;
}

const LEVELS = [
  { name: 'Explorer', min: 0, color: 'from-slate-500 to-slate-600', icon: '🌱' },
  { name: 'Adventurer', min: 100, color: 'from-blue-500 to-blue-600', icon: '🧭' },
  { name: 'Voyager', min: 500, color: 'from-purple-500 to-indigo-600', icon: '✈️' },
  { name: 'Elite', min: 2000, color: 'from-amber-500 to-orange-600', icon: '⭐' },
  { name: 'Ambassador', min: 5000, color: 'from-yellow-400 to-amber-500', icon: '👑' },
];

function getLevel(points: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].min) return i;
  }
  return 0;
}

export default function LoyaltyBanner({ className = '' }: LoyaltyBannerProps) {
  const [loyalty, setLoyalty] = useState<LoyaltyState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sv-loyalty');
      if (stored) {
        setLoyalty(JSON.parse(stored));
      } else {
        // Initialize loyalty from existing usage data
        const favorites = JSON.parse(localStorage.getItem('hotel-favorites') || '[]');
        const trips = JSON.parse(localStorage.getItem('saved-trips') || '[]');
        const recent = JSON.parse(localStorage.getItem('recently-viewed') || '[]');
        const recentSearches = JSON.parse(localStorage.getItem('sv-recent-searches') || '[]');

        const basePoints =
          favorites.length * 10 +
          trips.length * 25 +
          recent.length * 5 +
          recentSearches.length * 3;

        const levelIdx = getLevel(basePoints);
        const nextIdx = Math.min(levelIdx + 1, LEVELS.length - 1);

        const state: LoyaltyState = {
          points: basePoints,
          level: LEVELS[levelIdx].name,
          nextLevel: LEVELS[nextIdx].name,
          pointsToNext: nextIdx > levelIdx ? LEVELS[nextIdx].min - basePoints : 0,
          searches: recentSearches.length,
          comparisons: recent.length,
        };

        localStorage.setItem('sv-loyalty', JSON.stringify(state));
        setLoyalty(state);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  if (!loyalty || dismissed) return null;

  const levelIdx = getLevel(loyalty.points);
  const level = LEVELS[levelIdx];
  const nextLevel = LEVELS[Math.min(levelIdx + 1, LEVELS.length - 1)];
  const progress =
    levelIdx < LEVELS.length - 1
      ? ((loyalty.points - level.min) / (nextLevel.min - level.min)) * 100
      : 100;

  return (
    <div className={className}>
      <div
        className={`relative overflow-hidden rounded-2xl p-5 text-white bg-linear-to-r ${level.color}`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6" />

        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 text-white/50 hover:text-white/80 transition"
          aria-label="Dismiss"
        >
          ✕
        </button>

        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{level.icon}</span>
            <div>
              <p className="text-xs opacity-80">SVBooking Rewards</p>
              <p className="text-lg font-bold">{level.name} Member</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-2xl font-bold">{loyalty.points.toLocaleString()}</p>
              <p className="text-[10px] opacity-70">points earned</p>
            </div>
          </div>

          {levelIdx < LEVELS.length - 1 && (
            <div className="mb-3">
              <div className="flex justify-between text-[10px] opacity-80 mb-1">
                <span>{level.name}</span>
                <span>{loyalty.pointsToNext} pts to {nextLevel.name}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/80 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-4 text-[10px] opacity-80">
            <span>🔍 {loyalty.searches} searches</span>
            <span>📊 {loyalty.comparisons} comparisons</span>
            <span>💡 Earn points by searching, comparing & saving favorites</span>
          </div>
        </div>
      </div>
    </div>
  );
}
