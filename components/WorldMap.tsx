'use client';

import Link from 'next/link';

// Approximate x/y % positions on a rectangular world map (Mercator-ish)
const CITY_PINS: {
  city: string;
  country: string;
  x: number; // percent from left
  y: number; // percent from top
  emoji: string;
}[] = [
  { city: 'London',     country: 'UK',          x: 47.5, y: 22,   emoji: '🏰' },
  { city: 'Paris',      country: 'France',       x: 49,   y: 24,   emoji: '🗼' },
  { city: 'Amsterdam',  country: 'Netherlands',  x: 49.5, y: 21,   emoji: '🌷' },
  { city: 'Rome',       country: 'Italy',        x: 51,   y: 28,   emoji: '🏟' },
  { city: 'Barcelona',  country: 'Spain',        x: 48,   y: 27,   emoji: '⛪' },
  { city: 'Prague',     country: 'Czech Republic', x: 51.5, y: 22.5, emoji: '🏯' },
  { city: 'Vienna',     country: 'Austria',      x: 52,   y: 23,   emoji: '🎼' },
  { city: 'Istanbul',   country: 'Turkey',       x: 56,   y: 27,   emoji: '🕌' },
  { city: 'Dubai',      country: 'UAE',          x: 60,   y: 35,   emoji: '🏙' },
  { city: 'Tel Aviv',   country: 'Israel',       x: 56.5, y: 30,   emoji: '🌊' },
  { city: 'Jerusalem',  country: 'Israel',       x: 57,   y: 31,   emoji: '⛩' },
  { city: 'Bangkok',    country: 'Thailand',     x: 74,   y: 38,   emoji: '🏛' },
  { city: 'Phuket',     country: 'Thailand',     x: 74,   y: 42,   emoji: '🌴' },
  { city: 'Singapore',  country: 'Singapore',    x: 77,   y: 45,   emoji: '🦁' },
  { city: 'Bali',       country: 'Indonesia',    x: 79,   y: 49,   emoji: '🌺' },
  { city: 'Tokyo',      country: 'Japan',        x: 86,   y: 28,   emoji: '🗻' },
  { city: 'Sydney',     country: 'Australia',    x: 87,   y: 65,   emoji: '🦘' },
  { city: 'New York',   country: 'USA',          x: 27,   y: 26,   emoji: '🗽' },
  { city: 'Miami',      country: 'USA',          x: 26,   y: 32,   emoji: '🏖' },
  { city: 'Las Vegas',  country: 'USA',          x: 19,   y: 28,   emoji: '🎰' },
];

interface WorldMapProps {
  onCitySelect?: (city: string) => void;
  selectedCity?: string;
  className?: string;
}

export default function WorldMap({ onCitySelect, selectedCity, className = '' }: WorldMapProps) {
  return (
    <div className={`relative bg-gradient-to-b from-sky-100 to-blue-100 rounded-2xl overflow-hidden border border-blue-200 ${className}`}>
      {/* Ocean background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-200/50 via-blue-100/30 to-sky-200/50" />

      {/* Simple continent shapes using CSS */}
      <svg
        viewBox="0 0 1000 500"
        className="absolute inset-0 w-full h-full opacity-20"
        aria-hidden="true"
      >
        {/* Europe */}
        <ellipse cx="500" cy="200" rx="70" ry="50" fill="#6b7280" />
        {/* Asia */}
        <ellipse cx="700" cy="220" rx="150" ry="80" fill="#6b7280" />
        {/* Africa */}
        <ellipse cx="510" cy="330" rx="60" ry="80" fill="#6b7280" />
        {/* Americas */}
        <ellipse cx="230" cy="270" rx="80" ry="120" fill="#6b7280" />
        {/* Australia */}
        <ellipse cx="860" cy="380" rx="55" ry="40" fill="#6b7280" />
      </svg>

      {/* City pins */}
      {CITY_PINS.map((pin) => {
        const isSelected = selectedCity === pin.city;
        return (
          <button
            key={pin.city}
            onClick={() => onCitySelect?.(pin.city)}
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 group z-10 transition-transform hover:scale-125 ${
              isSelected ? 'scale-150 z-20' : ''
            }`}
            aria-label={`${pin.city}, ${pin.country}`}
            title={`${pin.city}, ${pin.country}`}
          >
            <div className={`flex flex-col items-center ${isSelected ? 'drop-shadow-lg' : ''}`}>
              <span className="text-lg leading-none">{pin.emoji}</span>
              <span className={`text-[9px] font-semibold mt-0.5 px-1 rounded whitespace-nowrap ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/80 text-slate-700 group-hover:bg-blue-100'
              }`}>
                {pin.city}
              </span>
            </div>
          </button>
        );
      })}

      <div className="relative h-64 md:h-80" aria-label="Interactive world map with hotel destinations" role="img" />
      <p className="relative text-center text-xs text-blue-400 pb-2">
        Click a city to explore deals
      </p>
    </div>
  );
}
