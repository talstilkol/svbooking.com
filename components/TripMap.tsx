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
  // Middle East
  'Tel Aviv': { lat: 32.08, lng: 34.78 },
  'Jerusalem': { lat: 31.77, lng: 35.22 },
  'Dubai': { lat: 25.20, lng: 55.27 },
  'Abu Dhabi': { lat: 24.45, lng: 54.65 },
  'Istanbul': { lat: 41.01, lng: 28.98 },
  'Cairo': { lat: 30.04, lng: 31.24 },
  'Riyadh': { lat: 24.71, lng: 46.67 },
  'Jeddah': { lat: 21.49, lng: 39.19 },
  'Doha': { lat: 25.29, lng: 51.53 },
  'Amman': { lat: 31.95, lng: 35.93 },
  'Muscat': { lat: 23.59, lng: 58.54 },
  'Manama': { lat: 26.23, lng: 50.59 },
  'Kuwait City': { lat: 29.38, lng: 47.99 },

  // Asia
  'Bangkok': { lat: 13.76, lng: 100.50 },
  'Phuket': { lat: 7.88, lng: 98.39 },
  'Chiang Mai': { lat: 18.79, lng: 98.98 },
  'Tokyo': { lat: 35.68, lng: 139.69 },
  'Kyoto': { lat: 35.01, lng: 135.77 },
  'Osaka': { lat: 34.69, lng: 135.50 },
  'Singapore': { lat: 1.35, lng: 103.82 },
  'Bali': { lat: -8.41, lng: 115.19 },
  'Seoul': { lat: 37.57, lng: 126.98 },
  'New Delhi': { lat: 28.61, lng: 77.21 },
  'Mumbai': { lat: 19.08, lng: 72.88 },
  'Jaipur': { lat: 26.91, lng: 75.79 },
  'Udaipur': { lat: 24.59, lng: 73.68 },
  'Goa': { lat: 15.50, lng: 73.83 },
  'Kuala Lumpur': { lat: 3.14, lng: 101.69 },
  'Colombo': { lat: 6.93, lng: 79.84 },
  'Hong Kong': { lat: 22.32, lng: 114.17 },
  'Shanghai': { lat: 31.23, lng: 121.47 },
  'Beijing': { lat: 39.90, lng: 116.40 },
  'Hanoi': { lat: 21.03, lng: 105.85 },
  'Ho Chi Minh City': { lat: 10.82, lng: 106.63 },
  'Maldives': { lat: 4.17, lng: 73.51 },
  'Taipei': { lat: 25.03, lng: 121.57 },

  // Europe
  'Paris': { lat: 48.86, lng: 2.35 },
  'Nice': { lat: 43.71, lng: 7.26 },
  'Lyon': { lat: 45.76, lng: 4.84 },
  'Cannes': { lat: 43.55, lng: 7.02 },
  'London': { lat: 51.51, lng: -0.13 },
  'Edinburgh': { lat: 55.95, lng: -3.19 },
  'Rome': { lat: 41.90, lng: 12.50 },
  'Florence': { lat: 43.77, lng: 11.25 },
  'Milan': { lat: 45.46, lng: 9.19 },
  'Venice': { lat: 45.44, lng: 12.32 },
  'Naples': { lat: 40.85, lng: 14.27 },
  'Amalfi Coast': { lat: 40.63, lng: 14.60 },
  'Barcelona': { lat: 41.39, lng: 2.17 },
  'Madrid': { lat: 40.42, lng: -3.70 },
  'Seville': { lat: 37.39, lng: -5.98 },
  'Granada': { lat: 37.18, lng: -3.60 },
  'Ibiza': { lat: 38.91, lng: 1.43 },
  'Palma de Mallorca': { lat: 39.57, lng: 2.65 },
  'Málaga': { lat: 36.72, lng: -4.42 },
  'Berlin': { lat: 52.52, lng: 13.41 },
  'Munich': { lat: 48.14, lng: 11.58 },
  'Hamburg': { lat: 53.55, lng: 9.99 },
  'Frankfurt': { lat: 50.11, lng: 8.68 },
  'Dresden': { lat: 51.05, lng: 13.74 },
  'Athens': { lat: 37.98, lng: 23.73 },
  'Santorini': { lat: 36.39, lng: 25.46 },
  'Mykonos': { lat: 37.45, lng: 25.33 },
  'Crete': { lat: 35.24, lng: 24.47 },
  'Lisbon': { lat: 38.72, lng: -9.14 },
  'Porto': { lat: 41.15, lng: -8.61 },
  'Amsterdam': { lat: 52.37, lng: 4.90 },
  'Prague': { lat: 50.08, lng: 14.44 },
  'Vienna': { lat: 48.21, lng: 16.37 },
  'Salzburg': { lat: 47.81, lng: 13.04 },
  'Budapest': { lat: 47.50, lng: 19.04 },
  'Zagreb': { lat: 45.81, lng: 15.98 },
  'Dubrovnik': { lat: 42.65, lng: 18.09 },
  'Split': { lat: 43.51, lng: 16.44 },
  'Helsinki': { lat: 60.17, lng: 24.94 },
  'Dublin': { lat: 53.35, lng: -6.26 },
  'Zurich': { lat: 47.37, lng: 8.54 },
  'Geneva': { lat: 46.20, lng: 6.14 },
  'Copenhagen': { lat: 55.68, lng: 12.57 },
  'Stockholm': { lat: 59.33, lng: 18.07 },
  'Krakow': { lat: 50.06, lng: 19.94 },
  'Warsaw': { lat: 52.23, lng: 21.01 },
  'Brussels': { lat: 50.85, lng: 4.35 },
  'Bruges': { lat: 51.21, lng: 3.22 },
  'Tallinn': { lat: 59.44, lng: 24.75 },
  'Reykjavik': { lat: 64.15, lng: -21.94 },
  'Oslo': { lat: 59.91, lng: 10.75 },
  'Tbilisi': { lat: 41.72, lng: 44.79 },
  'Batumi': { lat: 41.64, lng: 41.64 },
  'Vilnius': { lat: 54.69, lng: 25.28 },

  // Americas
  'New York': { lat: 40.71, lng: -74.01 },
  'Miami': { lat: 25.76, lng: -80.19 },
  'Las Vegas': { lat: 36.17, lng: -115.14 },
  'San Francisco': { lat: 37.77, lng: -122.42 },
  'Los Angeles': { lat: 34.05, lng: -118.24 },
  'Chicago': { lat: 41.88, lng: -87.63 },
  'Washington DC': { lat: 38.91, lng: -77.04 },
  'Boston': { lat: 42.36, lng: -71.06 },
  'Seattle': { lat: 47.61, lng: -122.33 },
  'Nashville': { lat: 36.16, lng: -86.78 },
  'Austin': { lat: 30.27, lng: -97.74 },
  'San Diego': { lat: 32.72, lng: -117.16 },
  'Honolulu': { lat: 21.31, lng: -157.86 },
  'Maui': { lat: 20.80, lng: -156.32 },
  'Scottsdale': { lat: 33.49, lng: -111.93 },
  'Toronto': { lat: 43.65, lng: -79.38 },
  'Montreal': { lat: 45.50, lng: -73.57 },
  'Vancouver': { lat: 49.28, lng: -123.12 },
  'Salvador': { lat: -12.97, lng: -38.51 },
  'Rio de Janeiro': { lat: -22.91, lng: -43.17 },
  'Cancun': { lat: 21.16, lng: -86.85 },
  'Mexico City': { lat: 19.43, lng: -99.13 },
  'Tulum': { lat: 20.21, lng: -87.46 },
  'Buenos Aires': { lat: -34.60, lng: -58.38 },
  'Lima': { lat: -12.05, lng: -77.04 },
  'Cusco': { lat: -13.53, lng: -71.97 },
  'Machu Picchu': { lat: -13.16, lng: -72.55 },
  'Bogota': { lat: 4.71, lng: -74.07 },
  'Cartagena': { lat: 10.39, lng: -75.51 },
  'Medellín': { lat: 6.25, lng: -75.56 },
  'Santiago': { lat: -33.45, lng: -70.67 },

  // Africa
  'Nairobi': { lat: -1.29, lng: 36.82 },
  'Marrakech': { lat: 31.63, lng: -8.00 },
  'Casablanca': { lat: 33.57, lng: -7.59 },
  'Cape Town': { lat: -33.92, lng: 18.42 },
  'Johannesburg': { lat: -26.20, lng: 28.05 },
  'Dar es Salaam': { lat: -6.79, lng: 39.28 },
  'Zanzibar': { lat: -6.17, lng: 39.19 },
  'Mauritius': { lat: -20.35, lng: 57.55 },
  'Addis Ababa': { lat: 9.02, lng: 38.75 },
  'Lagos': { lat: 6.52, lng: 3.38 },
  'Accra': { lat: 5.56, lng: -0.19 },

  // Oceania
  'Sydney': { lat: -33.87, lng: 151.21 },
  'Melbourne': { lat: -37.81, lng: 144.96 },
  'Brisbane': { lat: -27.47, lng: 153.03 },
  'Perth': { lat: -31.95, lng: 115.86 },
  'Auckland': { lat: -36.85, lng: 174.76 },
  'Queenstown': { lat: -45.03, lng: 168.66 },
  'Fiji': { lat: -17.77, lng: 177.95 },
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
        <p className="text-[10px] text-slate-500">{cities.size} destination{cities.size !== 1 ? 's' : ''}</p>
      </div>

      <div className="p-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-blue-50 rounded-xl">
          {/* Coordinate backdrop */}
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
