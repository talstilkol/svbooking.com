'use client';

import { useState, useEffect } from 'react';

interface FloatingCTAProps {
  hotelName: string;
  cheapestPrice?: number;
  currency?: string;
  provider?: string;
  bookingUrl?: string;
  className?: string;
}

export default function FloatingCTA({
  hotelName,
  cheapestPrice,
  currency = 'USD',
  provider,
  bookingUrl,
  className = '',
}: FloatingCTAProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past 600px
      setVisible(window.scrollY > 600);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible || !cheapestPrice) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 shadow-lg md:hidden transform transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      } ${className}`}
    >
      <div className="safe-area-bottom px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-800 truncate">{hotelName}</p>
          <p className="text-sm font-bold text-slate-900">
            {currency} {cheapestPrice.toFixed(0)}
            {provider && (
              <span className="text-[10px] font-normal text-slate-500 ml-1">via {provider}</span>
            )}
          </p>
        </div>
        {bookingUrl ? (
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shrink-0"
          >
            Book Now
          </a>
        ) : (
          <button
            onClick={() => {
              document.getElementById('price-results')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shrink-0"
          >
            See Prices
          </button>
        )}
      </div>
    </div>
  );
}
