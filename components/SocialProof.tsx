'use client';

import { useEffect, useState, useRef } from 'react';

const ACTIVITY_TEMPLATES = [
  { city: 'Paris', action: 'just compared prices', hotel: 'Le Meurice' },
  { city: 'Tokyo', action: 'found a deal', hotel: 'Park Hyatt Tokyo' },
  { city: 'Dubai', action: 'saved $127', hotel: 'Burj Al Arab' },
  { city: 'London', action: 'just booked via Booking.com', hotel: 'The Savoy' },
  { city: 'Bali', action: 'found 23% savings', hotel: 'Four Seasons Bali' },
  { city: 'Barcelona', action: 'just compared 6 providers', hotel: 'Hotel Arts' },
  { city: 'New York', action: 'saved $89 vs Expedia', hotel: 'The Plaza' },
  { city: 'Bangkok', action: 'found the cheapest rate', hotel: 'Mandarin Oriental' },
  { city: 'Singapore', action: 'just booked via Agoda', hotel: 'Marina Bay Sands' },
  { city: 'Istanbul', action: 'saved 18%', hotel: 'Four Seasons Bosphorus' },
  { city: 'Rome', action: 'compared prices from 8 sites', hotel: 'Palazzo Manfredi' },
  { city: 'Amsterdam', action: 'found a price drop', hotel: 'Waldorf Astoria' },
];

export default function SocialProof({ className = '' }: { className?: string }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [minutesAgo, setMinutesAgo] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Set random time only on client (avoids hydration mismatch)
    setMinutesAgo(Math.floor(Math.random() * 5) + 1);

    // Delay first show
    const initial = setTimeout(() => {
      setVisible(true);
    }, 5000);

    return () => clearTimeout(initial);
  }, []);

  useEffect(() => {
    if (!visible) return;

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIdx((prev) => (prev + 1) % ACTIVITY_TEMPLATES.length);
        setMinutesAgo(Math.floor(Math.random() * 5) + 1);
        setVisible(true);
      }, 500);
    }, 4000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, currentIdx]);

  const activity = ACTIVITY_TEMPLATES[currentIdx];

  return (
    <div
      className={`fixed bottom-24 md:bottom-6 left-4 z-40 transition-all duration-500 pointer-events-auto ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      } ${className}`}
    >
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3 pr-10 max-w-xs relative">
        <button
          onClick={() => setVisible(false)}
          className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-slate-300 hover:text-slate-500 text-xs"
          aria-label="Dismiss"
        >
          ✕
        </button>
        <p className="text-sm text-slate-700">
          <span className="font-semibold">{activity.hotel}</span>
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Someone in {activity.city} {activity.action}
        </p>
        <p className="text-[10px] text-slate-300 mt-1">
          {minutesAgo} min ago
        </p>
      </div>
    </div>
  );
}
