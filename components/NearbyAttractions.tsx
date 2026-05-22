'use client';

import { useEffect, useState } from 'react';

interface NearbyAttractionsProps {
  city: string;
  className?: string;
}

interface Attraction {
  name: string;
  type: string;
  distance: string;
  icon: string;
  rate?: number;
}

interface PoiResponseItem {
  name: string;
  type?: string;
  distance?: string;
  icon?: string;
  rate?: number;
}

export default function NearbyAttractions({ city, className = '' }: NearbyAttractionsProps) {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setAttractions([]);
    });

    fetch(`/api/pois?city=${encodeURIComponent(city)}&type=attractions`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.pois && data.pois.length > 0) {
          setAttractions(
            (data.pois as PoiResponseItem[]).slice(0, 8).map((p) => ({
              name: p.name,
              type: p.type || 'Attraction',
              distance: p.distance || 'Unavailable',
              icon: p.icon || '📍',
              rate: p.rate || 0,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [city]);

  if (loading) {
    return (
      <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
        <h3 className="text-sm font-bold text-slate-900 mb-3">Nearby Attractions</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (attractions.length === 0) return null;

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <h3 className="text-sm font-bold text-slate-900 mb-3">Nearby Attractions</h3>
      <div className="space-y-2">
        {attractions.map((a) => (
          <div key={`${a.name}-${a.type}`} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
            <span className="text-lg">{a.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-800 truncate">{a.name}</p>
              <p className="text-[10px] text-slate-400">
                {a.type} · Distance: {a.distance}
              </p>
            </div>
            {a.rate ? (
              <span className="text-[10px] text-slate-400">{a.rate.toFixed(1)}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
