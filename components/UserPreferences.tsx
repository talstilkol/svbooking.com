'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LOCAL_STORAGE_KEYS,
  readLocalStorageJson,
  writeLocalStorageJson,
} from '@/lib/local-storage-keys';

export interface Preferences {
  currency: string;
  sortDefault: 'price' | 'rating' | 'name';
  nightsDefault: number;
  showPricePerNight: boolean;
  compactView: boolean;
  emailAlerts: boolean;
  autoCompare: boolean;
}

const DEFAULTS: Preferences = {
  currency: 'USD',
  sortDefault: 'price',
  nightsDefault: 2,
  showPricePerNight: true,
  compactView: false,
  emailAlerts: false,
  autoCompare: true,
};

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const stored = readLocalStorageJson<Partial<Preferences> | null>(
        LOCAL_STORAGE_KEYS.userPreferences,
        null
      );
      if (stored && typeof stored === 'object') setPrefs({ ...DEFAULTS, ...stored });
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((partial: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      writeLocalStorageJson(LOCAL_STORAGE_KEYS.userPreferences, next);
      return next;
    });
  }, []);

  return { prefs, update, loaded };
}

interface UserPreferencesProps {
  className?: string;
}

export default function UserPreferences({ className = '' }: UserPreferencesProps) {
  const { prefs, update, loaded } = usePreferences();
  const [open, setOpen] = useState(false);

  if (!loaded) return null;

  return (
    <div className={className}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition"
      >
        ⚙️ Preferences
      </button>

      {open && (
        <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">⚙️ Your Preferences</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-600 transition"
            >
              ✕
            </button>
          </div>

          {/* Currency */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Default Currency</label>
            <select
              value={prefs.currency}
              onChange={(e) => update({ currency: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="GBP">£ GBP</option>
              <option value="ILS">₪ ILS</option>
              <option value="JPY">¥ JPY</option>
              <option value="THB">฿ THB</option>
            </select>
          </div>

          {/* Default Sort */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Default Sort</label>
            <div className="flex gap-2">
              {[
                { key: 'price', label: 'Price' },
                { key: 'rating', label: 'Rating' },
                { key: 'name', label: 'Name' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => update({ sortDefault: s.key as Preferences['sortDefault'] })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    prefs.sortDefault === s.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Default Nights */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Default Stay (nights)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 5, 7].map((n) => (
                <button
                  key={n}
                  onClick={() => update({ nightsDefault: n })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    prefs.nightsDefault === n
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Options */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            {[
              { key: 'showPricePerNight', label: 'Show price per night', desc: 'Display nightly rate instead of total' },
              { key: 'compactView', label: 'Compact view', desc: 'Smaller cards with less detail' },
              { key: 'autoCompare', label: 'Auto-compare on date change', desc: 'Automatically fetch prices when dates change' },
              { key: 'emailAlerts', label: 'Email price alerts', desc: 'Get notified of price drops (coming soon)' },
            ].map((opt) => (
              <label key={opt.key} className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={prefs[opt.key as keyof Preferences] as boolean}
                    onChange={(e) => update({ [opt.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer-checked:bg-blue-600 transition" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                  <p className="text-[10px] text-slate-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                update(DEFAULTS);
              }}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition"
            >
              Reset to Defaults
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
