'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LEGACY_LOCAL_STORAGE_KEYS,
  LOCAL_STORAGE_KEYS,
  readLocalStorageJsonWithFallback,
} from '@/lib/local-storage-keys';

interface Trip {
  id: string;
  hotelName: string;
  city: string;
  country: string;
  checkIn: string;
}

interface CityCoord {
  lat: number;
  lng: number;
}

const CITY_COORDS: Record<string, CityCoord> = {
  'Tel Aviv': { lat: 32.08, lng: 34.78 },
  'Jerusalem': { lat: 31.77, lng: 35.22 },
  'Paris': { lat: 48.86, lng: 2.35 },
  'London': { lat: 51.51, lng: -0.13 },
  'Tokyo': { lat: 35.68, lng: 139.69 },
  'Dubai': { lat: 25.20, lng: 55.27 },
  'Bangkok': { lat: 13.76, lng: 100.50 },
  'Bali': { lat: -8.41, lng: 115.19 },
  'Barcelona': { lat: 41.39, lng: 2.17 },
  'Rome': { lat: 41.90, lng: 12.50 },
  'New York': { lat: 40.71, lng: -74.01 },
  'Amsterdam': { lat: 52.37, lng: 4.90 },
  'Phuket': { lat: 7.88, lng: 98.39 },
  'Marrakech': { lat: 31.63, lng: -8.00 },
  'Sydney': { lat: -33.87, lng: 151.21 },
  'Prague': { lat: 50.08, lng: 14.44 },
  'Istanbul': { lat: 41.01, lng: 28.98 },
  'Singapore': { lat: 1.35, lng: 103.82 },
  'Lisbon': { lat: 38.72, lng: -9.14 },
  'Vienna': { lat: 48.21, lng: 16.37 },
};

function mercatorX(lng: number, width: number): number {
  return ((lng + 180) / 360) * width;
}

function mercatorY(lat: number, height: number): number {
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  return (height / 2) - (height * mercN) / (2 * Math.PI);
}

export default function TripMap({ className = '' }: { className?: string }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const stored = readLocalStorageJsonWithFallback<Trip[]>(
          LOCAL_STORAGE_KEYS.trips,
          [LEGACY_LOCAL_STORAGE_KEYS.trips],
          []
        );
        setTrips(stored);
      } catch {}
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const cities = useMemo(() => {
    const cityMap = new Map<string, { coord: CityCoord; trips: Trip[] }>();
    for (const trip of trips) {
      const coord = CITY_COORDS[trip.city];
      if (!coord) continue;
      if (!cityMap.has(trip.city)) {
        cityMap.set(trip.city, { coord, trips: [] });
      }
      cityMap.get(trip.city)!.trips.push(trip);
    }
    return cityMap;
  }, [trips]);

  if (trips.length === 0 || cities.size === 0) return null;

  const W = 600;
  const H = 300;

  // Draw connecting lines between cities in chronological order
  const sortedCities = Array.from(cities.entries())
    .sort((a, b) => {
      const aDate = Math.min(...a[1].trips.map((t) => new Date(t.checkIn).getTime()));
      const bDate = Math.min(...b[1].trips.map((t) => new Date(t.checkIn).getTime()));
      return aDate - bDate;
    });

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900">🗺️ Your Trip Map</h3>
        <p className="text-[10px] text-slate-400">{cities.size} destination{cities.size !== 1 ? 's' : ''}</p>
      </div>

      <div className="p-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-blue-50 rounded-xl">
          {/* Simple world outline placeholder */}
          <rect x="0" y="0" width={W} height={H} fill="#EFF6FF" rx="8" />

          {/* Grid lines */}
          {[-60, -30, 0, 30, 60].map((lat) => (
            <line
              key={`lat-${lat}`}
              x1="0"
              y1={mercatorY(lat, H)}
              x2={W}
              y2={mercatorY(lat, H)}
              stroke="#DBEAFE"
              strokeWidth="0.5"
            />
          ))}
          {[-120, -60, 0, 60, 120].map((lng) => (
            <line
              key={`lng-${lng}`}
              x1={mercatorX(lng, W)}
              y1="0"
              x2={mercatorX(lng, W)}
              y2={H}
              stroke="#DBEAFE"
              strokeWidth="0.5"
            />
          ))}

          {/* Connecting lines */}
          {sortedCities.map(([, data], i) => {
            if (i === 0) return null;
            const prev = sortedCities[i - 1][1].coord;
            const curr = data.coord;
            return (
              <line
                key={`line-${i}`}
                x1={mercatorX(prev.lng, W)}
                y1={mercatorY(prev.lat, H)}
                x2={mercatorX(curr.lng, W)}
                y2={mercatorY(curr.lat, H)}
                stroke="#3B82F6"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                opacity="0.5"
              />
            );
          })}

          {/* City markers */}
          {sortedCities.map(([city, data], i) => {
            const x = mercatorX(data.coord.lng, W);
            const y = mercatorY(data.coord.lat, H);
            const isHovered = hoveredCity === city;

            return (
              <g
                key={city}
                onMouseEnter={() => setHoveredCity(city)}
                onMouseLeave={() => setHoveredCity(null)}
                className="cursor-pointer"
              >
                {/* Pulse ring */}
                <circle cx={x} cy={y} r={isHovered ? 12 : 8} fill="#3B82F6" opacity="0.15" />
                <circle cx={x} cy={y} r={isHovered ? 7 : 5} fill="#3B82F6" />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize="6"
                  fontWeight="bold"
                >
                  {i + 1}
                </text>

                {/* Label */}
                {isHovered && (
                  <g>
                    <rect
                      x={x - 30}
                      y={y - 22}
                      width="60"
                      height="14"
                      rx="3"
                      fill="#1E293B"
                      opacity="0.9"
                    />
                    <text
                      x={x}
                      y={y - 13}
                      textAnchor="middle"
                      fill="white"
                      fontSize="7"
                      fontWeight="600"
                    >
                      {city}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-3">
          {sortedCities.map(([city, data], i) => (
            <span
              key={city}
              className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-50 px-2 py-1 rounded-lg"
            >
              <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[8px] font-bold">
                {i + 1}
              </span>
              {city} ({data.trips.length})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
