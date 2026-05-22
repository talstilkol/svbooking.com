'use client';

import { useEffect, useState } from 'react';
import {
  getHotelViewsStorageKey,
  getLegacyHotelViewsStorageKey,
  readLocalStorageJsonWithFallback,
  writeLocalStorageJson,
} from '@/lib/local-storage-keys';

interface ViewTrackerProps {
  hotelKey: string;
  className?: string;
}

interface HotelViewRecord {
  count: number;
  timestamps: number[];
}

export default function ViewTracker({ hotelKey, className = '' }: ViewTrackerProps) {
  const [viewCount, setViewCount] = useState(0);
  const [recentViews, setRecentViews] = useState(0);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const key = getHotelViewsStorageKey(hotelKey);
        const legacyKey = getLegacyHotelViewsStorageKey(hotelKey);
        const stored = readLocalStorageJsonWithFallback<HotelViewRecord>(
          key,
          [legacyKey],
          { count: 0, timestamps: [] }
        );
        const count = Number.isFinite(stored.count) ? stored.count + 1 : 1;
        const now = Date.now();
        const cutoff = now - 86400000;
        const timestamps = [
          ...(Array.isArray(stored.timestamps) ? stored.timestamps : []),
          now,
        ].filter((t: number) => t > cutoff);
        const updated = { count, timestamps };
        writeLocalStorageJson(key, updated);

        setViewCount(updated.count);
        setRecentViews(updated.timestamps.length);
      } catch {
        setViewCount(0);
        setRecentViews(0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hotelKey]);

  if (viewCount === 0) return null;

  return (
    <div className={`flex items-center gap-3 text-xs ${className}`}>
      <div className="flex items-center gap-1 text-slate-500">
        <span>👁️</span>
        <span>{viewCount.toLocaleString()} local view{viewCount !== 1 ? 's' : ''}</span>
      </div>
      {recentViews > 1 && (
        <div className="flex items-center gap-1 text-amber-600">
          <span>⏱️</span>
          <span>{recentViews} local views today</span>
        </div>
      )}
    </div>
  );
}
