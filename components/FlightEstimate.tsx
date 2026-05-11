'use client';

import { useMemo } from 'react';

interface FlightEstimateProps {
  city: string;
  className?: string;
}

interface FlightInfo {
  from: string;
  minPrice: number;
  maxPrice: number;
  duration: string;
  airlines: string[];
}

const FLIGHT_DATA: Record<string, FlightInfo[]> = {
  'Tel Aviv': [
    { from: 'New York', minPrice: 650, maxPrice: 1200, duration: '11h', airlines: ['El Al', 'United', 'Delta'] },
    { from: 'London', minPrice: 180, maxPrice: 450, duration: '5h', airlines: ['EasyJet', 'Wizz Air', 'British Airways'] },
    { from: 'Paris', minPrice: 150, maxPrice: 400, duration: '4.5h', airlines: ['Transavia', 'Air France', 'El Al'] },
  ],
  'Paris': [
    { from: 'New York', minPrice: 400, maxPrice: 900, duration: '8h', airlines: ['Air France', 'Delta', 'United'] },
    { from: 'London', minPrice: 80, maxPrice: 250, duration: '1.5h', airlines: ['EasyJet', 'Eurostar', 'British Airways'] },
    { from: 'Tel Aviv', minPrice: 150, maxPrice: 400, duration: '4.5h', airlines: ['Transavia', 'Air France', 'El Al'] },
  ],
  'London': [
    { from: 'New York', minPrice: 350, maxPrice: 800, duration: '7.5h', airlines: ['British Airways', 'Virgin', 'American'] },
    { from: 'Paris', minPrice: 80, maxPrice: 250, duration: '1.5h', airlines: ['EasyJet', 'Eurostar', 'Air France'] },
    { from: 'Dubai', minPrice: 300, maxPrice: 700, duration: '7h', airlines: ['Emirates', 'British Airways'] },
  ],
  'Tokyo': [
    { from: 'New York', minPrice: 700, maxPrice: 1500, duration: '14h', airlines: ['ANA', 'JAL', 'United'] },
    { from: 'London', minPrice: 550, maxPrice: 1200, duration: '12h', airlines: ['JAL', 'ANA', 'British Airways'] },
    { from: 'Bangkok', minPrice: 200, maxPrice: 500, duration: '6h', airlines: ['ANA', 'Thai Airways'] },
  ],
  'Dubai': [
    { from: 'New York', minPrice: 600, maxPrice: 1300, duration: '13h', airlines: ['Emirates', 'Delta'] },
    { from: 'London', minPrice: 300, maxPrice: 700, duration: '7h', airlines: ['Emirates', 'British Airways'] },
    { from: 'Mumbai', minPrice: 150, maxPrice: 400, duration: '3h', airlines: ['Emirates', 'IndiGo', 'Air India'] },
  ],
  'Bangkok': [
    { from: 'London', minPrice: 400, maxPrice: 900, duration: '11.5h', airlines: ['Thai Airways', 'British Airways'] },
    { from: 'Tokyo', minPrice: 200, maxPrice: 500, duration: '6h', airlines: ['ANA', 'Thai Airways'] },
    { from: 'Singapore', minPrice: 80, maxPrice: 200, duration: '2.5h', airlines: ['AirAsia', 'Thai Airways', 'Singapore Airlines'] },
  ],
  'Bali': [
    { from: 'Singapore', minPrice: 100, maxPrice: 300, duration: '2.5h', airlines: ['AirAsia', 'Singapore Airlines'] },
    { from: 'Sydney', minPrice: 200, maxPrice: 500, duration: '6h', airlines: ['Jetstar', 'Qantas'] },
    { from: 'Tokyo', minPrice: 300, maxPrice: 600, duration: '7h', airlines: ['ANA', 'Garuda'] },
  ],
  'Barcelona': [
    { from: 'London', minPrice: 60, maxPrice: 200, duration: '2.5h', airlines: ['Ryanair', 'Vueling', 'British Airways'] },
    { from: 'New York', minPrice: 400, maxPrice: 800, duration: '8h', airlines: ['Iberia', 'United', 'Delta'] },
    { from: 'Paris', minPrice: 50, maxPrice: 180, duration: '2h', airlines: ['Vueling', 'EasyJet', 'Air France'] },
  ],
  'New York': [
    { from: 'London', minPrice: 350, maxPrice: 800, duration: '7.5h', airlines: ['British Airways', 'Virgin', 'JetBlue'] },
    { from: 'Paris', minPrice: 400, maxPrice: 900, duration: '8h', airlines: ['Air France', 'Delta', 'United'] },
    { from: 'Tel Aviv', minPrice: 650, maxPrice: 1200, duration: '11h', airlines: ['El Al', 'United'] },
  ],
  'Rome': [
    { from: 'London', minPrice: 60, maxPrice: 250, duration: '2.5h', airlines: ['Ryanair', 'EasyJet', 'British Airways'] },
    { from: 'New York', minPrice: 450, maxPrice: 900, duration: '9h', airlines: ['ITA Airways', 'Delta', 'United'] },
    { from: 'Paris', minPrice: 50, maxPrice: 180, duration: '2h', airlines: ['Vueling', 'EasyJet', 'Air France'] },
  ],
};

export default function FlightEstimate({ city, className = '' }: FlightEstimateProps) {
  const flights = useMemo(() => FLIGHT_DATA[city] || [], [city]);

  if (flights.length === 0) return null;

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <h3 className="text-sm font-bold text-slate-900 mb-1">✈️ Flight Estimates to {city}</h3>
      <p className="text-[10px] text-slate-400 mb-4">Approximate round-trip prices</p>

      <div className="space-y-3">
        {flights.map((f) => (
          <div
            key={f.from}
            className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800">From {f.from}</p>
              <p className="text-[10px] text-slate-400">
                {f.duration} · {f.airlines.slice(0, 2).join(', ')}
                {f.airlines.length > 2 ? ` +${f.airlines.length - 2}` : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-slate-900">
                ${f.minPrice} – ${f.maxPrice}
              </p>
              <p className="text-[9px] text-slate-400">round trip</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-slate-400 mt-3 text-center">
        Prices are estimates based on average fares. Actual prices may vary.
      </p>
    </div>
  );
}
