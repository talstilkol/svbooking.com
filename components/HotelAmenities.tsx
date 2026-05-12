'use client';

import { useState, useEffect, useMemo } from 'react';

interface HotelAmenitiesProps {
  hotelKey: string;
  className?: string;
}

interface AmenityItem {
  icon: string;
  label: string;
}

const ALL_AMENITIES: AmenityItem[] = [
  { icon: '📶', label: 'Free WiFi' },
  { icon: '🅿️', label: 'Parking' },
  { icon: '🏊', label: 'Swimming Pool' },
  { icon: '💪', label: 'Fitness Center' },
  { icon: '🍳', label: 'Breakfast' },
  { icon: '🧳', label: 'Concierge' },
  { icon: '❄️', label: 'Air Conditioning' },
  { icon: '🧹', label: 'Daily Housekeeping' },
  { icon: '☕', label: 'Coffee/Tea Maker' },
  { icon: '🛁', label: 'Spa/Wellness' },
  { icon: '🍽️', label: 'Restaurant' },
  { icon: '🛎️', label: '24h Front Desk' },
  { icon: '👔', label: 'Business Center' },
  { icon: '🚐', label: 'Airport Shuttle' },
  { icon: '🔒', label: 'Safe' },
  { icon: '📺', label: 'Flat-screen TV' },
];

/**
 * Deterministically selects amenities based on hotelKey hash.
 * Used as fallback when real OSM data is not available.
 */
function getHashAmenities(hotelKey: string): AmenityItem[] {
  let hash = 0;
  for (let i = 0; i < hotelKey.length; i++) {
    hash = ((hash << 5) - hash + hotelKey.charCodeAt(i)) | 0;
  }
  const seed = Math.abs(hash);

  // All hotels get WiFi, AC, housekeeping, TV, safe
  const guaranteed = [0, 6, 7, 15, 14];
  const optional = ALL_AMENITIES.map((_, i) => i).filter((i) => !guaranteed.includes(i));

  // Pick 4-7 additional amenities based on hash
  const count = 4 + (seed % 4);
  const shuffled = optional.sort((a, b) => {
    const ha = ((seed * (a + 1) * 2654435761) >>> 0) % 1000;
    const hb = ((seed * (b + 1) * 2654435761) >>> 0) % 1000;
    return ha - hb;
  });

  const selected = [...guaranteed, ...shuffled.slice(0, count)];
  selected.sort((a, b) => a - b);

  return selected.map((i) => ALL_AMENITIES[i]);
}

export default function HotelAmenities({ hotelKey, className = '' }: HotelAmenitiesProps) {
  const [liveAmenities, setLiveAmenities] = useState<AmenityItem[] | null>(null);
  const [isLive, setIsLive] = useState(false);
  const hashAmenities = useMemo(() => getHashAmenities(hotelKey), [hotelKey]);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/hotel-amenities?key=${encodeURIComponent(hotelKey)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.amenities && data.amenities.length > 0) {
          setLiveAmenities(data.amenities);
          setIsLive(true);
        }
      })
      .catch(() => { /* use hash fallback */ });

    return () => { cancelled = true; };
  }, [hotelKey]);

  const amenities = liveAmenities || hashAmenities;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-slate-800 text-sm">Hotel Amenities</h3>
        {isLive && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
            Verified
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {amenities.map((a) => (
          <span
            key={a.label}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
          >
            <span aria-hidden="true">{a.icon}</span>
            {a.label}
          </span>
        ))}
      </div>
    </div>
  );
}
