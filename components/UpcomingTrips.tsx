'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from '@/components/LocaleProvider';
import {
  LEGACY_LOCAL_STORAGE_KEYS,
  LOCAL_STORAGE_KEYS,
  readLocalStorageJsonWithFallback,
} from '@/lib/local-storage-keys';

interface Trip {
  id: string;
  hotelKey: string;
  hotelName: string;
  city: string;
  country: string;
  image: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  notes?: string;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(1, Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  ));
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  ));
}

function timingLabel(days: number, t: (key: string) => string): string {
  if (days === 0) return t('upcomingTripsToday');
  if (days === 1) return t('upcomingTripsTomorrow');
  return interpolate(t('upcomingTripsDays'), { days });
}

export default function UpcomingTrips({ className = '' }: { className?: string }) {
  const { t } = useLocale();
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const stored = readLocalStorageJsonWithFallback<Trip[]>(
          LOCAL_STORAGE_KEYS.trips,
          [LEGACY_LOCAL_STORAGE_KEYS.trips],
          []
        );
        const upcoming = stored
          .filter((t: Trip) => daysUntil(t.checkIn) >= 0)
          .sort((a: Trip, b: Trip) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
          .slice(0, 3);
        setTrips(upcoming);
      } catch {}
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (trips.length === 0) {
    return (
      <div className={`bg-white border border-slate-200 rounded-2xl p-6 text-center ${className}`}>
        <span className="text-3xl block mb-2">✈️</span>
        <p className="text-sm text-slate-500 mb-3">{t('upcomingTripsEmpty')}</p>
        <Link
          href="/trips"
          className="text-xs text-blue-600 font-medium hover:text-blue-700"
        >
          {t('upcomingTripsPlan')} →
        </Link>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">✈️ {t('upcomingTripsTitle')}</h3>
        <Link href="/trips" className="text-[10px] text-blue-600 font-medium hover:text-blue-700">
          {t('upcomingTripsViewAll')} →
        </Link>
      </div>

      <div className="divide-y divide-slate-50">
        {trips.map((trip) => {
          const days = daysUntil(trip.checkIn);
          const nights = nightsBetween(trip.checkIn, trip.checkOut);
          const isUrgent = days <= 7;
          const nightWord = t(nights === 1 ? 'upcomingTripsNightSingular' : 'upcomingTripsNightPlural');
          const guestWord = t(trip.guests === 1 ? 'upcomingTripsGuestSingular' : 'upcomingTripsGuestPlural');

          return (
            <Link
              key={trip.id}
              href={`/hotel/${trip.hotelKey}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition"
            >
              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                <Image
                  src={trip.image}
                  alt={trip.hotelName}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{trip.hotelName}</p>
                <p className="text-[10px] text-slate-500">
                  {interpolate(t('upcomingTripsSummary'), {
                    city: trip.city,
                    nights,
                    nightWord,
                    guests: trip.guests,
                    guestWord,
                  })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-xs font-bold ${isUrgent ? 'text-red-600' : 'text-slate-700'}`}>
                  {timingLabel(days, t)}
                </p>
                <p className="text-[9px] text-slate-500">{trip.checkIn}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
