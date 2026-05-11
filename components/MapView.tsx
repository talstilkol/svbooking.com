'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CITY_COORDINATES, type CityCoordinate } from '@/lib/city-coordinates';

interface Hotel {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
}

interface MapViewProps {
  hotels: Hotel[];
  className?: string;
  selectedCity?: string;
  onCitySelect?: (city: string) => void;
}

// Group hotels by city for marker clustering
function groupByCity(hotels: Hotel[]) {
  const map = new Map<string, { coord: CityCoordinate; hotels: Hotel[] }>();
  for (const h of hotels) {
    const coord = CITY_COORDINATES.find(
      (c) => c.city.toLowerCase() === h.city.toLowerCase()
    );
    if (!coord) continue;
    const existing = map.get(h.city);
    if (existing) {
      existing.hotels.push(h);
    } else {
      map.set(h.city, { coord, hotels: [h] });
    }
  }
  return Array.from(map.values());
}

// Pure CSS/SVG map — no external library needed
export default function MapView({
  hotels,
  className = '',
  selectedCity,
  onCitySelect,
}: MapViewProps) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const groups = groupByCity(hotels);

  // Map projection (Mercator-like, simplified for our lat/lng range)
  const MAP_W = 900;
  const MAP_H = 500;

  function projectLng(lng: number) {
    return ((lng + 180) / 360) * MAP_W;
  }

  function projectLat(lat: number) {
    const latRad = (lat * Math.PI) / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    return MAP_H / 2 - (MAP_W * mercN) / (2 * Math.PI);
  }

  const handleMouseMove = (e: React.MouseEvent, city: string) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
    });
    setHoveredCity(city);
  };

  const hoveredGroup = groups.find((g) => g.coord.city === hoveredCity);

  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Hotel Map</h3>
        <p className="text-xs text-slate-400">
          {groups.length} cities · {hotels.length} hotels · Click a city to explore
        </p>
      </div>

      <div
        ref={containerRef}
        className="relative bg-gradient-to-b from-sky-50 to-blue-50 overflow-hidden"
        style={{ aspectRatio: `${MAP_W}/${MAP_H}` }}
      >
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          className="w-full h-full"
          aria-label="Map showing hotel locations"
        >
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={(MAP_H / 4) * i}
              x2={MAP_W}
              y2={(MAP_H / 4) * i}
              stroke="#e2e8f0"
              strokeWidth={0.5}
            />
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <line
              key={`v${i}`}
              x1={(MAP_W / 6) * i}
              y1={0}
              x2={(MAP_W / 6) * i}
              y2={MAP_H}
              stroke="#e2e8f0"
              strokeWidth={0.5}
            />
          ))}

          {/* City markers */}
          {groups.map(({ coord, hotels: cityHotels }) => {
            const x = projectLng(coord.lng);
            const y = projectLat(coord.lat);
            const isSelected = selectedCity === coord.city;
            const isHovered = hoveredCity === coord.city;
            const r = Math.max(6, Math.min(12, 4 + cityHotels.length * 2));

            return (
              <g key={coord.city}>
                {/* Pulse ring for selected */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + 6}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    opacity={0.4}
                  >
                    <animate
                      attributeName="r"
                      from={r + 4}
                      to={r + 14}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from={0.4}
                      to={0}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {/* Marker */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? r + 2 : r}
                  fill={isSelected ? '#2563eb' : isHovered ? '#3b82f6' : '#60a5fa'}
                  stroke="white"
                  strokeWidth={2}
                  className="cursor-pointer transition-all"
                  onMouseMove={(e) => handleMouseMove(e as unknown as React.MouseEvent, coord.city)}
                  onMouseLeave={() => setHoveredCity(null)}
                  onClick={() => onCitySelect?.(coord.city)}
                />
                {/* Count */}
                <text
                  x={x}
                  y={y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white text-[9px] font-bold pointer-events-none select-none"
                >
                  {cityHotels.length}
                </text>
                {/* City label */}
                <text
                  x={x}
                  y={y + r + 12}
                  textAnchor="middle"
                  className="fill-slate-600 text-[10px] font-medium pointer-events-none select-none"
                >
                  {coord.city}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredCity && hoveredGroup && (
          <div
            className="absolute z-20 bg-white rounded-lg shadow-lg border border-slate-200 p-3 pointer-events-none"
            style={{
              left: Math.min(tooltipPos.x, (containerRef.current?.offsetWidth || 300) - 200),
              top: tooltipPos.y - 80,
              minWidth: 180,
            }}
          >
            <p className="text-sm font-semibold text-slate-800">
              {hoveredGroup.coord.city}, {hoveredGroup.coord.country}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {hoveredGroup.hotels.length} hotel{hoveredGroup.hotels.length !== 1 ? 's' : ''}
            </p>
            <div className="mt-1.5 space-y-0.5">
              {hoveredGroup.hotels.slice(0, 3).map((h) => (
                <p key={h.hotelKey} className="text-xs text-slate-600 truncate">
                  • {h.name}
                </p>
              ))}
              {hoveredGroup.hotels.length > 3 && (
                <p className="text-xs text-blue-500">
                  +{hoveredGroup.hotels.length - 3} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* City list below map */}
      <div className="p-3 flex flex-wrap gap-1.5 border-t border-slate-100 bg-slate-50/50">
        {groups
          .sort((a, b) => b.hotels.length - a.hotels.length)
          .map(({ coord, hotels: cityHotels }) => (
            <Link
              key={coord.city}
              href={`/search?city=${encodeURIComponent(coord.city)}`}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCity === coord.city
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {coord.city}
              <span className="text-[10px] opacity-60">{cityHotels.length}</span>
            </Link>
          ))}
      </div>
    </div>
  );
}
