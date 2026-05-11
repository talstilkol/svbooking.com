'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RecentSearch {
  query: string;
  timestamp: number;
  resultCount?: number;
}

const MAX_RECENT = 8;
const STORAGE_KEY = 'recent-searches';

export function addRecentSearch(query: string, resultCount?: number) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const searches: RecentSearch[] = raw ? JSON.parse(raw) : [];
    // Remove duplicate
    const filtered = searches.filter(
      (s) => s.query.toLowerCase() !== query.toLowerCase()
    );
    filtered.unshift({ query, timestamp: Date.now(), resultCount });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(filtered.slice(0, MAX_RECENT))
    );
  } catch {}
}

export default function RecentSearches({ className = '' }: { className?: string }) {
  const [searches, setSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSearches(JSON.parse(raw));
    } catch {}
  }, []);

  const clearAll = () => {
    setSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  if (searches.length === 0) return null;

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-slate-400">Recent searches</h3>
        <button
          onClick={clearAll}
          className="text-[10px] text-slate-300 hover:text-red-400 transition"
        >
          Clear all
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {searches.map((s) => (
          <Link
            key={s.query}
            href={`/search?city=${encodeURIComponent(s.query)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 transition group"
          >
            <span className="text-slate-300 group-hover:text-blue-400">🕐</span>
            <span>{s.query}</span>
            <span className="text-[10px] text-slate-300">{timeAgo(s.timestamp)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
