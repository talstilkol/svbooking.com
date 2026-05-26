'use client';

import { useState } from 'react';

interface PriceBreakdownProps {
  pricePerNight: number;
  nights: number;
  provider?: string;
  currency?: string;
  className?: string;
}

export default function PriceBreakdown({
  pricePerNight,
  nights,
  provider,
  currency = '$',
  className = '',
}: PriceBreakdownProps) {
  const [showDetails, setShowDetails] = useState(false);

  const subtotal = pricePerNight * nights;
  const total = Math.round(subtotal);
  const perNightTotal = nights > 0 ? Math.round(subtotal / nights) : 0;

  if (nights <= 0 || pricePerNight <= 0) return null;

  return (
    <div className={className}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-between p-4 bg-linear-to-r from-slate-50 to-white border border-slate-200 rounded-xl hover:shadow-sm transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900">
              {currency}{total} total
            </p>
            <p className="text-xs text-slate-500">
              {currency}{perNightTotal}/night avg · {nights} night{nights !== 1 ? 's' : ''}
              {provider ? ` via ${provider}` : ''}
            </p>
          </div>
        </div>
        <span className="text-xs text-blue-600 font-medium">
          {showDetails ? 'Hide' : 'See breakdown'}
        </span>
      </button>

      {showDetails && (
        <div className="mt-2 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">
              {currency}{Math.round(pricePerNight)} × {nights} night{nights !== 1 ? 's' : ''}
              </span>
              <span className="text-slate-900 font-medium">{currency}{total}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Taxes and provider fees</span>
              <span className="text-slate-500 font-medium">Provider total only</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Room-level fees</span>
              <span className="text-slate-500 font-medium">Unavailable</span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <div className="flex justify-between">
              <span className="font-bold text-slate-900">Total</span>
              <span className="font-bold text-slate-900 text-lg">{currency}{total}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              This is the provider-reported total returned for the selected dates. A line-item
              tax and fee breakdown is unavailable in SV Booking.
            </p>
          </div>

          {provider && (
            <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
              <span className="text-sm">ℹ️</span>
              <p className="text-xs text-blue-700">
                Final price will be confirmed on {provider}&apos;s website.
                Taxes and fees may differ based on your location.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
