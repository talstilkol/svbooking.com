'use client';

import { useEffect, useState } from 'react';

interface StickyCompareBarProps {
  hotelName: string;
  cheapestProvider?: string;
  cheapestPrice?: number;
  currency?: string;
  nights?: number;
  visible?: boolean;
}

export default function StickyCompareBar({
  hotelName,
  cheapestProvider,
  cheapestPrice,
  currency = 'USD',
  nights = 1,
  visible = true,
}: StickyCompareBarProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible || !cheapestPrice) {
      queueMicrotask(() => setShow(false));
      return;
    }
    const handleScroll = () => {
      setShow(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visible, cheapestPrice]);

  if (!show || !cheapestPrice) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm transform transition-transform duration-300 hidden md:block"
      style={{ transform: show ? 'translateY(0)' : 'translateY(-100%)' }}
    >
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-800 truncate">{hotelName}</h2>
          <p className="text-xs text-slate-500">
            Lowest returned price from {cheapestProvider}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-lg font-bold text-green-700">
              {currency} {cheapestPrice.toFixed(0)}
            </p>
            {nights > 1 && (
              <p className="text-[10px] text-slate-500">
                {currency} {(cheapestPrice / nights).toFixed(0)}/night
              </p>
            )}
          </div>
          <button
            onClick={() => {
              const el = document.getElementById('price-results');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
          >
            View Deal
          </button>
        </div>
      </div>
    </div>
  );
}
