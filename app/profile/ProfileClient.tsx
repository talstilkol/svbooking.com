'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MapPin, Users, Calendar, DollarSign, Save, Heart, Plane } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';
import { useToast } from '@/components/Toast';
import { useFavorites, useTrips } from '@/lib/useLocalStorage';
import Skeleton from '@/components/Skeleton';

interface Props {
  userEmail: string;
  userName: string;
  userFamilyName: string;
  userPicture: string;
}

interface Prefs {
  homeCity?: string;
  defaultGuests?: number;
  defaultTripLength?: number;
  currency?: 'USD' | 'EUR' | 'ILS' | 'GBP';
  favoriteDestinations?: string[];
}

export default function ProfileClient({ userEmail, userName, userFamilyName, userPicture }: Props) {
  const toast = useToast();
  const { favorites } = useFavorites();
  const { trips } = useTrips();
  const [prefs, setPrefs] = useState<Prefs>({
    defaultGuests: 2,
    defaultTripLength: 3,
    currency: 'USD',
    favoriteDestinations: [],
  });
  const [destInput, setDestInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cloudEnabled, setCloudEnabled] = useState(false);

  useEffect(() => {
    fetch('/api/me/prefs')
      .then((r) => r.json())
      .then((d) => {
        setPrefs((p) => ({ ...p, ...(d.prefs || {}) }));
        setCloudEnabled(d.cloudEnabled || false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/me/prefs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.showToast('Preferences saved');
    } catch (e) {
      toast.showToast(e instanceof Error ? e.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addDestination = () => {
    const v = destInput.trim();
    if (!v) return;
    setPrefs((p) => ({
      ...p,
      favoriteDestinations: Array.from(new Set([...(p.favoriteDestinations || []), v])).slice(0, 20),
    }));
    setDestInput('');
  };
  const removeDestination = (d: string) => {
    setPrefs((p) => ({ ...p, favoriteDestinations: (p.favoriteDestinations || []).filter((x) => x !== d) }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Reveal>
        <div className="flex items-center gap-5 mb-10">
          {userPicture ? (
            <img src={userPicture} alt="" className="w-20 h-20 rounded-full object-cover ring-4 ring-indigo-500/20" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl ring-4 ring-indigo-500/20">
              {(userName?.[0] || userEmail?.[0] || 'U').toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              {userName} {userFamilyName}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1 mt-1">
              <Mail className="w-4 h-4" />
              {userEmail}
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-3">
            <Heart className="w-8 h-8 text-pink-500" />
            <div>
              <div className="text-2xl font-bold">{favorites.length}</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Favorites</div>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-3">
            <Plane className="w-8 h-8 text-purple-500" />
            <div>
              <div className="text-2xl font-bold">{trips.length}</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Trips planned</div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.16}>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Travel preferences</h2>
            {!cloudEnabled && (
              <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                Local only (KV not configured)
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-5">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2 mb-1.5">
                  <MapPin className="w-4 h-4" />
                  Home city
                </label>
                <input
                  type="text"
                  value={prefs.homeCity || ''}
                  onChange={(e) => setPrefs({ ...prefs, homeCity: e.target.value })}
                  placeholder="e.g. Tel Aviv"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2 mb-1.5">
                    <Users className="w-4 h-4" />
                    Default guests
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={prefs.defaultGuests || 2}
                    onChange={(e) => setPrefs({ ...prefs, defaultGuests: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2 mb-1.5">
                    <Calendar className="w-4 h-4" />
                    Default nights
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={prefs.defaultTripLength || 3}
                    onChange={(e) => setPrefs({ ...prefs, defaultTripLength: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2 mb-1.5">
                    <DollarSign className="w-4 h-4" />
                    Currency
                  </label>
                  <select
                    value={prefs.currency || 'USD'}
                    onChange={(e) => setPrefs({ ...prefs, currency: e.target.value as Prefs['currency'] })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  >
                    <option>USD</option>
                    <option>EUR</option>
                    <option>ILS</option>
                    <option>GBP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                  Favorite destinations
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={destInput}
                    onChange={(e) => setDestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addDestination();
                      }
                    }}
                    placeholder="Add a city…"
                    className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={addDestination}
                    className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-sm font-semibold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(prefs.favoriteDestinations || []).map((d) => (
                    <motion.span
                      key={d}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-sm"
                    >
                      {d}
                      <button onClick={() => removeDestination(d)} className="ml-1 hover:text-indigo-900">
                        ×
                      </button>
                    </motion.span>
                  ))}
                  {(prefs.favoriteDestinations || []).length === 0 && (
                    <span className="text-sm text-zinc-500">None yet.</span>
                  )}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-linear-to-r from-indigo-600 to-pink-600 text-white font-semibold shadow-lg disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save preferences'}
              </motion.button>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}
