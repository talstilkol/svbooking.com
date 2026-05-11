'use client';

import { useState, useMemo } from 'react';

interface TripCostCalculatorProps {
  hotelPricePerNight: number;
  nights: number;
  currency: string;
  className?: string;
}

export default function TripCostCalculator({
  hotelPricePerNight,
  nights,
  currency,
  className = '',
}: TripCostCalculatorProps) {
  const [guests, setGuests] = useState(2);
  const [includeBreakfast, setIncludeBreakfast] = useState(false);
  const [includeTransport, setIncludeTransport] = useState(false);

  const breakdown = useMemo(() => {
    const hotelTotal = hotelPricePerNight * nights;
    const breakfastPerDay = includeBreakfast ? 25 * guests : 0;
    const breakfastTotal = breakfastPerDay * nights;
    const transportTotal = includeTransport ? 60 * guests : 0;
    const total = hotelTotal + breakfastTotal + transportTotal;
    const perPerson = total / guests;
    const perNight = total / nights;

    return {
      hotelTotal,
      breakfastTotal,
      transportTotal,
      total,
      perPerson,
      perNight,
    };
  }, [hotelPricePerNight, nights, guests, includeBreakfast, includeTransport]);

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-700 mb-4">
        💰 Trip Cost Calculator
      </h3>

      {/* Inputs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-medium block mb-1">
            Guests
          </label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setGuests(Math.max(1, guests - 1))}
              className="w-7 h-7 rounded bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 text-sm"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-medium text-slate-800">
              {guests}
            </span>
            <button
              onClick={() => setGuests(Math.min(10, guests + 1))}
              className="w-7 h-7 rounded bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 text-sm"
            >
              +
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeBreakfast}
            onChange={(e) => setIncludeBreakfast(e.target.checked)}
            className="rounded accent-blue-600"
          />
          <span className="text-xs text-slate-600">Breakfast</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeTransport}
            onChange={(e) => setIncludeTransport(e.target.checked)}
            className="rounded accent-blue-600"
          />
          <span className="text-xs text-slate-600">Transport</span>
        </label>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">
            Hotel ({nights} night{nights !== 1 ? 's' : ''})
          </span>
          <span className="font-medium text-slate-700">
            {currency} {breakdown.hotelTotal.toFixed(0)}
          </span>
        </div>
        {includeBreakfast && (
          <div className="flex justify-between">
            <span className="text-slate-500">
              Breakfast ({guests} × {nights}d)
            </span>
            <span className="font-medium text-slate-700">
              {currency} {breakdown.breakfastTotal.toFixed(0)}
            </span>
          </div>
        )}
        {includeTransport && (
          <div className="flex justify-between">
            <span className="text-slate-500">Airport transfer ({guests}p)</span>
            <span className="font-medium text-slate-700">
              {currency} {breakdown.transportTotal.toFixed(0)}
            </span>
          </div>
        )}
        <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between">
          <span className="font-semibold text-slate-800">Total</span>
          <span className="font-bold text-lg text-slate-900">
            {currency} {breakdown.total.toFixed(0)}
          </span>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>{currency} {breakdown.perPerson.toFixed(0)}/person</span>
          <span>{currency} {breakdown.perNight.toFixed(0)}/night total</span>
        </div>
      </div>
    </div>
  );
}
