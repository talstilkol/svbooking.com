'use client';

import { useState, useEffect } from 'react';

interface HotelAmenitiesProps {
  hotelKey: string;
  className?: string;
}

interface AmenityItem {
  icon: string;
  label: string;
}

export default function HotelAmenities({ hotelKey, className = '' }: HotelAmenitiesProps) {
  const [liveAmenities, setLiveAmenities] = useState<AmenityItem[] | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/hotel-amenities?key=${encodeURIComponent(hotelKey)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.amenities && data.amenities.length > 0) {
          setLiveAmenities(data.amenities);
          setSource(data.source || null);
        }
      })
      .catch(() => { /* amenities unavailable */ })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => { cancelled = true; };
  }, [hotelKey]);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-slate-800 text-sm">Hotel Amenities</h3>
        {liveAmenities && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
            {source === 'osm-cache' ? 'OSM cached' : 'OSM source'}
          </span>
        )}
      </div>
      {liveAmenities ? (
        <div className="flex flex-wrap gap-2">
          {liveAmenities.map((a) => (
            <span
              key={a.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <span aria-hidden="true">{a.icon}</span>
              {a.label}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          {loaded ? 'Verified amenity data is unavailable for this property.' : 'Checking verified amenity data...'}
        </p>
      )}
    </div>
  );
}
