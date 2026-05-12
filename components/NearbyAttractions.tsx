'use client';

import { useState, useEffect, useMemo } from 'react';

interface NearbyAttractionsProps {
  city: string;
  className?: string;
}

interface Attraction {
  name: string;
  type: string;
  distance: string;
  icon: string;
  rate?: number;
}

const CITY_ATTRACTIONS: Record<string, Attraction[]> = {
  'Tel Aviv': [
    { name: 'Carmel Market', type: 'Market', distance: '0.5 km', icon: '🛒' },
    { name: 'Gordon Beach', type: 'Beach', distance: '0.3 km', icon: '🏖️' },
    { name: 'Tel Aviv Museum of Art', type: 'Museum', distance: '1.2 km', icon: '🎨' },
    { name: 'Jaffa Old City', type: 'Historic', distance: '2.5 km', icon: '🏛️' },
    { name: 'Rothschild Boulevard', type: 'Landmark', distance: '0.8 km', icon: '🌳' },
  ],
  'Jerusalem': [
    { name: 'Western Wall', type: 'Religious', distance: '0.5 km', icon: '🕍' },
    { name: 'Church of the Holy Sepulchre', type: 'Religious', distance: '0.7 km', icon: '⛪' },
    { name: 'Tower of David', type: 'Museum', distance: '0.3 km', icon: '🏰' },
    { name: 'Mahane Yehuda Market', type: 'Market', distance: '1.5 km', icon: '🛒' },
    { name: 'Mount of Olives', type: 'Viewpoint', distance: '2 km', icon: '⛰️' },
  ],
  'Paris': [
    { name: 'Eiffel Tower', type: 'Landmark', distance: '1.5 km', icon: '🗼' },
    { name: 'Louvre Museum', type: 'Museum', distance: '0.8 km', icon: '🎨' },
    { name: 'Champs-Elysees', type: 'Shopping', distance: '0.5 km', icon: '🛍️' },
    { name: 'Notre-Dame', type: 'Historic', distance: '2 km', icon: '⛪' },
    { name: 'Montmartre', type: 'Neighborhood', distance: '3 km', icon: '🎭' },
  ],
  'London': [
    { name: 'Big Ben', type: 'Landmark', distance: '1.2 km', icon: '🕐' },
    { name: 'Tower of London', type: 'Historic', distance: '2 km', icon: '🏰' },
    { name: 'British Museum', type: 'Museum', distance: '0.8 km', icon: '🏛️' },
    { name: 'Hyde Park', type: 'Park', distance: '1 km', icon: '🌳' },
    { name: 'Covent Garden', type: 'Entertainment', distance: '0.6 km', icon: '🎭' },
  ],
  'Tokyo': [
    { name: 'Shibuya Crossing', type: 'Landmark', distance: '1 km', icon: '🚦' },
    { name: 'Meiji Shrine', type: 'Temple', distance: '1.5 km', icon: '⛩️' },
    { name: 'Tsukiji Outer Market', type: 'Market', distance: '2 km', icon: '🍣' },
    { name: 'Shinjuku Gyoen', type: 'Park', distance: '0.8 km', icon: '🌸' },
    { name: 'Tokyo Tower', type: 'Landmark', distance: '3 km', icon: '🗼' },
  ],
  'Dubai': [
    { name: 'Burj Khalifa', type: 'Landmark', distance: '1 km', icon: '🏢' },
    { name: 'Dubai Mall', type: 'Shopping', distance: '1.2 km', icon: '🛍️' },
    { name: 'Dubai Marina', type: 'Waterfront', distance: '5 km', icon: '🚤' },
    { name: 'Gold Souk', type: 'Market', distance: '3 km', icon: '✨' },
    { name: 'Palm Jumeirah', type: 'Island', distance: '8 km', icon: '🏝️' },
  ],
  'Bangkok': [
    { name: 'Grand Palace', type: 'Palace', distance: '1.5 km', icon: '🏯' },
    { name: 'Wat Pho', type: 'Temple', distance: '1.8 km', icon: '🛕' },
    { name: 'Chatuchak Market', type: 'Market', distance: '5 km', icon: '🛒' },
    { name: 'Khao San Road', type: 'Nightlife', distance: '2 km', icon: '🎉' },
    { name: 'Chao Phraya River', type: 'Waterfront', distance: '0.5 km', icon: '🚢' },
  ],
  'Bali': [
    { name: 'Ubud Monkey Forest', type: 'Nature', distance: '2 km', icon: '🐒' },
    { name: 'Tanah Lot Temple', type: 'Temple', distance: '15 km', icon: '🛕' },
    { name: 'Tegallalang Rice Terraces', type: 'Nature', distance: '8 km', icon: '🌾' },
    { name: 'Seminyak Beach', type: 'Beach', distance: '10 km', icon: '🏖️' },
    { name: 'Sacred Monkey Forest', type: 'Nature', distance: '3 km', icon: '🌴' },
  ],
  'Barcelona': [
    { name: 'Sagrada Familia', type: 'Landmark', distance: '2 km', icon: '⛪' },
    { name: 'La Rambla', type: 'Street', distance: '0.5 km', icon: '🚶' },
    { name: 'Park Guell', type: 'Park', distance: '4 km', icon: '🌳' },
    { name: 'Gothic Quarter', type: 'Historic', distance: '0.8 km', icon: '🏛️' },
    { name: 'Barceloneta Beach', type: 'Beach', distance: '1.5 km', icon: '🏖️' },
  ],
  'Rome': [
    { name: 'Colosseum', type: 'Historic', distance: '0.5 km', icon: '🏟️' },
    { name: 'Trevi Fountain', type: 'Landmark', distance: '1 km', icon: '⛲' },
    { name: 'Vatican City', type: 'Religious', distance: '3 km', icon: '🏛️' },
    { name: 'Pantheon', type: 'Historic', distance: '1.2 km', icon: '🏛️' },
    { name: 'Spanish Steps', type: 'Landmark', distance: '1.5 km', icon: '🪜' },
  ],
  'Singapore': [
    { name: 'Gardens by the Bay', type: 'Park', distance: '1 km', icon: '🌳' },
    { name: 'Marina Bay', type: 'Waterfront', distance: '0.5 km', icon: '🌃' },
    { name: 'Sentosa Island', type: 'Resort', distance: '5 km', icon: '🏝️' },
    { name: 'Chinatown', type: 'Neighborhood', distance: '2 km', icon: '🏮' },
    { name: 'Orchard Road', type: 'Shopping', distance: '3 km', icon: '🛍️' },
  ],
};

const DEFAULT_ATTRACTIONS: Attraction[] = [
  { name: 'City Center', type: 'Area', distance: '0.5 km', icon: '🏙️' },
  { name: 'Main Market', type: 'Market', distance: '1 km', icon: '🛒' },
  { name: 'Old Town', type: 'Historic', distance: '1.5 km', icon: '🏛️' },
  { name: 'Central Park', type: 'Park', distance: '2 km', icon: '🌳' },
  { name: 'Shopping District', type: 'Shopping', distance: '0.8 km', icon: '🛍️' },
];

export default function NearbyAttractions({ city, className = '' }: NearbyAttractionsProps) {
  const [liveAttractions, setLiveAttractions] = useState<Attraction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('static');

  const fallback = useMemo(() => CITY_ATTRACTIONS[city] || DEFAULT_ATTRACTIONS, [city]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLiveAttractions(null);

    fetch(`/api/pois?city=${encodeURIComponent(city)}&type=attractions`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.pois && data.pois.length > 0) {
          setLiveAttractions(
            data.pois.slice(0, 8).map((p: any) => ({
              name: p.name,
              type: p.type || 'Attraction',
              distance: p.distance || '?',
              icon: p.icon || '📍',
              rate: p.rate || 0,
            }))
          );
          setSource(data.source || 'live');
        }
      })
      .catch(() => { /* use fallback */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [city]);

  const attractions = liveAttractions || fallback;
  const isLive = liveAttractions !== null;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-700">
          Nearby Attractions in {city}
        </h3>
        {isLive && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
            Live
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-4">
        {isLive ? 'Real-time data from OpenStreetMap & OpenTripMap' : 'Popular places near this hotel'}
      </p>

      {loading && !liveAttractions ? (
        <div className="space-y-3">
          {fallback.map((a) => (
            <div key={a.name} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition">
              <span className="text-xl w-8 text-center shrink-0 opacity-50" aria-hidden="true">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{a.name}</p>
                <p className="text-[10px] text-slate-400">{a.type}</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0 bg-slate-100 px-2 py-0.5 rounded-full">{a.distance}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {attractions.map((a) => (
            <div
              key={a.name}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition"
            >
              <span className="text-xl w-8 text-center shrink-0" aria-hidden="true">
                {a.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">
                  {a.name}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] text-slate-400">{a.type}</p>
                  {a.rate && a.rate >= 2 ? (
                    <span className="text-[9px] text-amber-500">{'*'.repeat(a.rate)}</span>
                  ) : null}
                </div>
              </div>
              <span className="text-xs text-slate-400 shrink-0 bg-slate-100 px-2 py-0.5 rounded-full">
                {a.distance}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
