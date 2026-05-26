'use client';

import { useState, useEffect } from 'react';
import {
  getLegacyTravelChecklistStorageKey,
  getTravelChecklistStorageKey,
  readLocalStorageJsonWithFallback,
  writeLocalStorageJson,
} from '@/lib/local-storage-keys';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

const DEFAULT_ITEMS: Omit<ChecklistItem, 'checked'>[] = [
  { id: 'passport', label: 'Check passport validity' },
  { id: 'insurance', label: 'Travel insurance' },
  { id: 'flights', label: 'Book flights' },
  { id: 'hotel', label: 'Compare hotel prices' },
  { id: 'transport', label: 'Airport transfer' },
  { id: 'currency', label: 'Exchange currency' },
  { id: 'packing', label: 'Pack essentials' },
  { id: 'documents', label: 'Print confirmations' },
];

interface TravelChecklistProps {
  hotelKey?: string;
  className?: string;
}

export default function TravelChecklist({ hotelKey, className = '' }: TravelChecklistProps) {
  const storageKey = getTravelChecklistStorageKey(hotelKey);
  const legacyStorageKey = getLegacyTravelChecklistStorageKey(hotelKey);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const defaults = DEFAULT_ITEMS.map((i) => ({ ...i, checked: false }));
      const stored = readLocalStorageJsonWithFallback<ChecklistItem[]>(
        storageKey,
        [legacyStorageKey],
        defaults
      );
      setItems(Array.isArray(stored) ? stored : defaults);
    });
    return () => {
      cancelled = true;
    };
  }, [legacyStorageKey, storageKey]);

  const toggle = (id: string) => {
    const updated = items.map((i) =>
      i.id === id ? { ...i, checked: !i.checked } : i
    );
    setItems(updated);
    writeLocalStorageJson(storageKey, updated);
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const progress = items.length > 0 ? (checkedCount / items.length) * 100 : 0;

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`w-full bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 transition ${className}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">✅ Travel Checklist</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {checkedCount}/{items.length} items completed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-blue-600 text-sm font-medium">Open →</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">✅ Travel Checklist</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {checkedCount} of {items.length} done
          </p>
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-slate-500 hover:text-slate-600"
        >
          Collapse ↑
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress === 100 ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <label
            key={item.id}
            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
              item.checked ? 'bg-green-50' : 'hover:bg-slate-50'
            }`}
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggle(item.id)}
              className="w-4 h-4 rounded accent-green-600"
            />
            <span
              className={`text-sm ${
                item.checked
                  ? 'text-green-700 line-through'
                  : 'text-slate-700'
              }`}
            >
              {item.label}
            </span>
          </label>
        ))}
      </div>

      {progress === 100 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-sm font-medium text-green-700">Checklist completed on this device.</p>
        </div>
      )}
    </div>
  );
}
