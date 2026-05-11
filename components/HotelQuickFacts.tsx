'use client';

import { useMemo } from 'react';

interface HotelQuickFactsProps {
  hotelKey: string;
  hotelName: string;
  city: string;
  className?: string;
}

function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function HotelQuickFacts({
  hotelKey,
  hotelName,
  city,
  className = '',
}: HotelQuickFactsProps) {
  const facts = useMemo(() => {
    const h = hashKey(hotelKey);
    const stars = 3 + (h % 3); // 3-5 stars
    const rooms = 50 + (h % 250);
    const yearBuilt = 1960 + (h % 60);
    const yearRenovated = Math.max(yearBuilt + 10, 2015 + (h % 10));
    const floors = 3 + (h % 25);
    const distCenter = (0.5 + (h % 50) / 10).toFixed(1);
    const distAirport = (5 + (h % 40)).toFixed(0);
    const checkIn = `${14 + (h % 3)}:00`;
    const checkOut = `${10 + (h % 3)}:00`;

    return [
      { icon: '⭐', label: 'Category', value: `${stars}-Star Hotel` },
      { icon: '🏨', label: 'Rooms', value: `${rooms} rooms` },
      { icon: '🏗️', label: 'Built', value: `${yearBuilt}` },
      { icon: '🔧', label: 'Renovated', value: `${yearRenovated}` },
      { icon: '🏢', label: 'Floors', value: `${floors}` },
      { icon: '📍', label: 'City center', value: `${distCenter} km` },
      { icon: '✈️', label: 'Airport', value: `${distAirport} km` },
      { icon: '🕐', label: 'Check-in', value: `From ${checkIn}` },
      { icon: '🕐', label: 'Check-out', value: `Until ${checkOut}` },
      { icon: '🌐', label: 'Languages', value: 'EN, Local' },
    ];
  }, [hotelKey]);

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <h3 className="text-sm font-bold text-slate-900 mb-3">📋 Quick Facts — {hotelName}</h3>

      <div className="grid grid-cols-2 gap-2">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
          >
            <span className="text-sm">{fact.icon}</span>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400">{fact.label}</p>
              <p className="text-xs text-slate-700 font-medium truncate">{fact.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
