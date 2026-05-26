'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { buildMapMarkers, type MapHotel, type MapMarker } from '@/lib/map-markers';

interface MapViewProps {
  hotels: MapHotel[];
  className?: string;
  selectedCity?: string;
  onCitySelect?: (city: string) => void;
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

  const markers = buildMapMarkers(hotels);

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
    const rawX = e.clientX - rect.left;
    const clampedX = Math.min(Math.max(rawX, 100), Math.max(100, rect.width - 100));
    setTooltipPos({
      x: clampedX,
      y: e.clientY - rect.top - 10,
    });
    setHoveredCity(city);
  };

  const hoveredMarker = markers.find((marker) => marker.id === hoveredCity);
  const selectMarker = (marker: MapMarker) => {
    onCitySelect?.(marker.coord.city);
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Hotel Map</h3>
        <p className="text-xs text-slate-500">
          {markers.length} markers · {hotels.length} hotels · Exact pins appear when verified coordinates exist
        </p>
      </div>

      <div
        ref={containerRef}
        className="relative bg-linear-to-b from-sky-50 to-blue-50 overflow-hidden"
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
          {markers.map((marker) => {
            const { coord, hotels: markerHotels } = marker;
            const x = projectLng(coord.lng);
            const y = projectLat(coord.lat);
            const isSelected = marker.kind === 'city' && selectedCity === coord.city;
            const isHovered = hoveredCity === marker.id;
            const r = marker.kind === 'hotel' ? 7 : Math.max(6, Math.min(12, 4 + markerHotels.length * 2));

            return (
              <g key={marker.id}>
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
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`${marker.kind === 'hotel' ? 'Exact property pin' : 'City cluster'}: ${marker.label}`}
                  className="cursor-pointer"
                  onMouseMove={(e) => handleMouseMove(e as unknown as React.MouseEvent, marker.id)}
                  onMouseLeave={() => setHoveredCity(null)}
                  onFocus={() => setHoveredCity(marker.id)}
                  onBlur={() => setHoveredCity(null)}
                  onClick={() => selectMarker(marker)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectMarker(marker);
                    }
                  }}
                >
                  <title>
                    {marker.kind === 'hotel'
                      ? `${marker.label}, exact property coordinates`
                      : `${marker.label}, city cluster fallback`}
                  </title>
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? r + 2 : r}
                    fill={isSelected ? '#2563eb' : isHovered ? '#3b82f6' : '#60a5fa'}
                    stroke="white"
                    strokeWidth={2}
                    className="transition-all"
                  />
                </g>
                {/* Count */}
                <text
                  x={x}
                  y={y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white text-[9px] font-bold pointer-events-none select-none"
                >
                  {marker.kind === 'hotel' ? '1' : markerHotels.length}
                </text>
                {/* City label */}
                <text
                  x={x}
                  y={y + r + 12}
                  textAnchor="middle"
                  className="fill-slate-600 text-[10px] font-medium pointer-events-none select-none"
                >
                  {marker.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredCity && hoveredMarker && (
          <div
            className="absolute z-20 bg-white rounded-lg shadow-lg border border-slate-200 p-3 pointer-events-none"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y - 80,
              minWidth: 180,
              transform: 'translateX(-50%)',
            }}
          >
            <p className="text-sm font-semibold text-slate-800">
              {hoveredMarker.kind === 'hotel'
                ? hoveredMarker.hotels[0]?.name
                : `${hoveredMarker.coord.city}, ${hoveredMarker.coord.country}`}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {hoveredMarker.kind === 'hotel'
                ? `${hoveredMarker.hotels[0]?.city}, ${hoveredMarker.hotels[0]?.country}`
                : `${hoveredMarker.hotels.length} hotel${hoveredMarker.hotels.length !== 1 ? 's' : ''}`}
            </p>
            <div className="mt-1.5 space-y-0.5">
              {hoveredMarker.hotels.slice(0, 3).map((h) => (
                <p key={h.hotelKey} className="text-xs text-slate-600 truncate">
                  • {h.name}
                </p>
              ))}
              {hoveredMarker.hotels.length > 3 && (
                <p className="text-xs text-blue-500">
                  +{hoveredMarker.hotels.length - 3} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-slate-50/50">
        <div className="px-4 pt-4">
          <h4 className="text-sm font-semibold text-slate-700">Map locations</h4>
          <p className="text-xs text-slate-500">
            Exact property pins are used only when verified coordinates exist; otherwise hotels stay grouped by city.
          </p>
        </div>
        <div className="p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {markers.map((marker) => {
            const sourceLabel = marker.coordinateSource === 'property'
              ? 'Exact property coordinates'
              : 'City cluster fallback';
            const countLabel = marker.kind === 'hotel'
              ? `${marker.hotels[0]?.city}, ${marker.hotels[0]?.country}`
              : `${marker.hotels.length} hotel${marker.hotels.length !== 1 ? 's' : ''}`;
            const href = marker.kind === 'hotel'
              ? `/hotel/${marker.hotels[0]?.hotelKey}`
              : `/search?city=${encodeURIComponent(marker.coord.city)}`;

            return (
              <Link
                key={marker.id}
                href={href}
                className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-blue-300 hover:text-blue-700"
              >
                <span className="block font-medium text-slate-800">{marker.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{countLabel}</span>
                <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {sourceLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="p-3 flex flex-wrap gap-1.5 border-t border-slate-100 bg-slate-50/50">
        {markers
          .filter((marker) => marker.kind === 'city')
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
