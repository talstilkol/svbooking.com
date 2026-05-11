'use client';

import { useEffect, useState, useMemo } from 'react';

interface ViewTrackerProps {
  hotelKey: string;
  className?: string;
}

function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function ViewTracker({ hotelKey, className = '' }: ViewTrackerProps) {
  const [viewCount, setViewCount] = useState(0);
  const [recentViews, setRecentViews] = useState(0);

  const baseViews = useMemo(() => {
    const h = hashKey(hotelKey);
    return 200 + (h % 800);
  }, [hotelKey]);

  useEffect(() => {
    try {
      // Track this view
      const key = `sv-views-${hotelKey}`;
      const stored = JSON.parse(localStorage.getItem(key) || '{"count":0,"timestamps":[]}');
      stored.count += 1;
      const now = Date.now();
      stored.timestamps.push(now);
      // Keep only last 24h of timestamps
      const cutoff = now - 86400000;
      stored.timestamps = (stored.timestamps as number[]).filter((t: number) => t > cutoff);
      localStorage.setItem(key, JSON.stringify(stored));

      setViewCount(baseViews + stored.count);
      setRecentViews(stored.timestamps.length);
    } catch {
      setViewCount(baseViews);
      setRecentViews(1);
    }
  }, [hotelKey, baseViews]);

  if (viewCount === 0) return null;

  return (
    <div className={`flex items-center gap-3 text-xs ${className}`}>
      <div className="flex items-center gap-1 text-slate-500">
        <span>👁️</span>
        <span>{viewCount.toLocaleString()} views</span>
      </div>
      {recentViews > 1 && (
        <div className="flex items-center gap-1 text-amber-600">
          <span>🔥</span>
          <span>{recentViews} people viewing today</span>
        </div>
      )}
    </div>
  );
}
