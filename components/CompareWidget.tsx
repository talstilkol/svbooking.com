'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LOCAL_STORAGE_KEYS, readLocalStorageJsonWithFallback, writeLocalStorageJson } from '@/lib/local-storage-keys';

interface CompareItem {
  hotelKey: string;
  name: string;
  city: string;
  image: string;
}

const MAX_COMPARE = 4;

export function useCompareList() {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        setItems(readLocalStorageJsonWithFallback<CompareItem[]>(LOCAL_STORAGE_KEYS.compareList, [], []));
      } catch {}
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = (next: CompareItem[]) => {
    setItems(next);
    try {
      writeLocalStorageJson(LOCAL_STORAGE_KEYS.compareList, next);
    } catch {}
  };

  const add = (item: CompareItem) => {
    if (items.length >= MAX_COMPARE) return false;
    if (items.some((i) => i.hotelKey === item.hotelKey)) return false;
    save([...items, item]);
    return true;
  };

  const remove = (hotelKey: string) => {
    save(items.filter((i) => i.hotelKey !== hotelKey));
  };

  const clear = () => save([]);

  const isInList = (hotelKey: string) => items.some((i) => i.hotelKey === hotelKey);

  return { items, add, remove, clear, isInList, isFull: items.length >= MAX_COMPARE };
}

export default function CompareWidget({ className = '' }: { className?: string }) {
  const { items, remove, clear } = useCompareList();
  const [minimized, setMinimized] = useState(false);

  if (items.length === 0) return null;

  const compareUrl = `/compare-hotels?hotels=${items.map((i) => i.hotelKey).join(',')}`;

  return (
    <div
      className={`fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 ${className}`}
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setMinimized(!minimized)}
          className="w-full flex items-center justify-between px-4 py-3 bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">📊 Compare ({items.length}/{MAX_COMPARE})</span>
          </div>
          <svg
            className={`w-4 h-4 transition-transform ${minimized ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {!minimized && (
          <div className="p-3 space-y-2">
            {items.map((item) => (
              <div
                key={item.hotelKey}
                className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
              >
                <div
                  className="w-10 h-10 rounded-lg bg-cover bg-center shrink-0"
                  style={{ backgroundImage: `url(${item.image})` }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-500">{item.city}</p>
                </div>
                <button
                  onClick={() => remove(item.hotelKey)}
                  className="text-slate-500 hover:text-red-500 transition text-xs p-1"
                  aria-label={`Remove ${item.name} from compare`}
                >
                  ✕
                </button>
              </div>
            ))}

            <div className="flex gap-2 pt-1">
              <Link
                href={compareUrl}
                className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
              >
                Compare Now →
              </Link>
              <button
                onClick={clear}
                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
