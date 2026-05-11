'use client';

import { useMemo } from 'react';

interface HotelBadgesProps {
  hotelKey: string;
  className?: string;
}

interface Badge {
  icon: string;
  label: string;
  color: string;
}

function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const ALL_BADGES: Badge[] = [
  { icon: '🏆', label: 'Top Rated', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { icon: '💎', label: 'Premium', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { icon: '🔥', label: 'Popular', color: 'bg-red-100 text-red-800 border-red-200' },
  { icon: '💰', label: 'Great Value', color: 'bg-green-100 text-green-800 border-green-200' },
  { icon: '🌟', label: 'Guest Favorite', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { icon: '🆕', label: 'Newly Listed', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { icon: '♻️', label: 'Eco Certified', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { icon: '👨‍👩‍👧‍👦', label: 'Family Friendly', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  { icon: '💑', label: 'Romantic', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { icon: '🏖️', label: 'Beach Access', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
];

export default function HotelBadges({ hotelKey, className = '' }: HotelBadgesProps) {
  const badges = useMemo(() => {
    const h = hashKey(hotelKey);
    const count = 2 + (h % 3); // 2-4 badges
    const selected: Badge[] = [];
    for (let i = 0; i < count && i < ALL_BADGES.length; i++) {
      const idx = (h + i * 7) % ALL_BADGES.length;
      if (!selected.includes(ALL_BADGES[idx])) {
        selected.push(ALL_BADGES[idx]);
      }
    }
    return selected;
  }, [hotelKey]);

  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.color}`}
        >
          <span>{badge.icon}</span>
          {badge.label}
        </span>
      ))}
    </div>
  );
}
