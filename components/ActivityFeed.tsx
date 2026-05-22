'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LEGACY_LOCAL_STORAGE_KEYS,
  LOCAL_STORAGE_KEYS,
  readLocalStorageJsonWithFallback,
} from '@/lib/local-storage-keys';

interface Activity {
  id: string;
  type: 'view' | 'favorite' | 'trip' | 'search' | 'alert';
  title: string;
  detail: string;
  href?: string;
  timestamp: number;
}

interface RecentHotelRecord {
  hotelKey: string;
  name: string;
  city: string;
  timestamp?: number;
  viewedAt?: string;
}

interface RecentSearchRecord {
  query: string;
  resultCount?: number;
  count?: number;
  timestamp?: number;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

const ICONS: Record<string, string> = {
  view: '👁️',
  favorite: '❤️',
  trip: '✈️',
  search: '🔍',
  alert: '🔔',
};

export default function ActivityFeed({ className = '' }: { className?: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const feed: Activity[] = [];

      try {
        const recent = readLocalStorageJsonWithFallback<RecentHotelRecord[]>(
          LOCAL_STORAGE_KEYS.recentlyViewed,
          [LEGACY_LOCAL_STORAGE_KEYS.recentlyViewed],
          []
        );
        recent.slice(0, 5).forEach((h) => {
          const timestamp = h.timestamp || (typeof h.viewedAt === 'string' ? Date.parse(h.viewedAt) : 0);
          if (!timestamp) return;
          feed.push({
            id: `view-${h.hotelKey}`,
            type: 'view',
            title: `Viewed ${h.name}`,
            detail: h.city,
            href: `/hotel/${h.hotelKey}`,
            timestamp,
          });
        });

        const favs = readLocalStorageJsonWithFallback<{ hotelKey: string; name: string; city: string; addedAt?: string }[]>(
          LOCAL_STORAGE_KEYS.favorites,
          [LEGACY_LOCAL_STORAGE_KEYS.favorites],
          []
        );
        favs.slice(0, 3).forEach((h: { hotelKey: string; name: string; city: string; addedAt?: string }) => {
          const timestamp = h.addedAt ? Date.parse(h.addedAt) : 0;
          if (!Number.isFinite(timestamp) || timestamp <= 0) return;
          feed.push({
            id: `fav-${h.hotelKey}`,
            type: 'favorite',
            title: `Favorited ${h.name}`,
            detail: h.city,
            href: `/hotel/${h.hotelKey}`,
            timestamp,
          });
        });

        const trips = readLocalStorageJsonWithFallback<{ id: string; hotelName: string; city: string; checkIn: string; createdAt?: string }[]>(
          LOCAL_STORAGE_KEYS.trips,
          [LEGACY_LOCAL_STORAGE_KEYS.trips],
          []
        );
        trips.slice(0, 3).forEach((t: { id: string; hotelName: string; city: string; checkIn: string; createdAt?: string }) => {
          const timestamp = t.createdAt ? Date.parse(t.createdAt) : 0;
          if (!Number.isFinite(timestamp) || timestamp <= 0) return;
          feed.push({
            id: `trip-${t.id}`,
            type: 'trip',
            title: `Planned trip to ${t.hotelName}`,
            detail: `${t.city} · ${t.checkIn}`,
            href: '/trips',
            timestamp,
          });
        });

        const searches = readLocalStorageJsonWithFallback<RecentSearchRecord[]>(
          LOCAL_STORAGE_KEYS.recentSearches,
          [LEGACY_LOCAL_STORAGE_KEYS.recentSearches, LEGACY_LOCAL_STORAGE_KEYS.recentSearchesUnprefixed],
          []
        );
        searches.slice(0, 3).forEach((s, i) => {
          if (!s.timestamp) return;
          feed.push({
            id: `search-${s.query}-${i}`,
            type: 'search',
            title: `Searched "${s.query}"`,
            detail: `${s.count ?? s.resultCount ?? 0} results`,
            href: `/search?city=${encodeURIComponent(s.query)}`,
            timestamp: s.timestamp,
          });
        });

      } catch {}

      feed.sort((a, b) => b.timestamp - a.timestamp);
      setActivities(feed.slice(0, 10));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (activities.length === 0) {
    return (
      <div className={`bg-white border border-slate-200 rounded-2xl p-8 text-center ${className}`}>
        <span className="text-3xl block mb-2">📋</span>
        <p className="text-sm text-slate-500">No activity yet. Start exploring hotels!</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900">📋 Recent Activity</h3>
      </div>
      <div className="divide-y divide-slate-50">
        {activities.map((a) => (
          <div key={a.id} className="px-5 py-3 hover:bg-slate-50 transition">
            {a.href ? (
              <Link href={a.href} className="flex items-center gap-3">
                <span className="text-lg shrink-0">{ICONS[a.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{a.title}</p>
                  <p className="text-[10px] text-slate-400">{a.detail}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(a.timestamp)}</span>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-lg shrink-0">{ICONS[a.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{a.title}</p>
                  <p className="text-[10px] text-slate-400">{a.detail}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(a.timestamp)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
