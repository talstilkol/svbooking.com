'use client';

import { useMemo } from 'react';

interface HotelAmenitiesProps {
  hotelKey: string;
  className?: string;
}

const ALL_AMENITIES = [
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
 * In production, this would come from the hotel's actual data.
 */
export default function HotelAmenities({ hotelKey, className = '' }: HotelAmenitiesProps) {
  const amenities = useMemo(() => {
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
  }, [hotelKey]);

  return (
    <div className={className}>
      <h3 className="font-semibold text-slate-800 mb-3 text-sm">Hotel Amenities</h3>
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
