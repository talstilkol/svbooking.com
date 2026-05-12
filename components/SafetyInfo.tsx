'use client';

import { useState, useEffect, useMemo } from 'react';

interface SafetyInfoProps {
  city: string;
  className?: string;
}

interface SafetyData {
  overallRating: number; // 1-5
  tips: string[];
  areas: { name: string; safe: boolean; note: string }[];
  vaccinations: string;
  waterSafety: string;
}

const SAFETY: Record<string, SafetyData> = {
  'Tel Aviv': {
    overallRating: 4,
    tips: ['Very safe for tourists', 'Beach areas well-monitored', 'Use sunscreen — strong Mediterranean sun'],
    areas: [
      { name: 'Rothschild Blvd', safe: true, note: 'Trendy, very safe' },
      { name: 'Jaffa', safe: true, note: 'Historic, safe daytime & evening' },
      { name: 'South Tel Aviv', safe: false, note: 'Exercise caution at night' },
    ],
    vaccinations: 'None required',
    waterSafety: 'Tap water is safe to drink',
  },
  'Paris': {
    overallRating: 4,
    tips: ['Watch for pickpockets at tourist sites', 'Use official taxis or ride apps', 'Keep valuables secure on metro'],
    areas: [
      { name: 'Le Marais', safe: true, note: 'Safe, vibrant neighborhood' },
      { name: 'Champs-Élysées', safe: true, note: 'Busy, watch for scams' },
      { name: 'Gare du Nord area', safe: false, note: 'Caution at night' },
    ],
    vaccinations: 'None required',
    waterSafety: 'Tap water is safe to drink',
  },
  'London': {
    overallRating: 4,
    tips: ['Very safe overall', 'Mind the gap on the Tube', 'Look right when crossing streets!'],
    areas: [
      { name: 'Westminster/Covent Garden', safe: true, note: 'Well-policed tourist areas' },
      { name: 'South Bank', safe: true, note: 'Popular, safe walk along Thames' },
      { name: 'Camden at night', safe: false, note: 'Stay on main roads' },
    ],
    vaccinations: 'None required',
    waterSafety: 'Tap water is safe to drink',
  },
  'Tokyo': {
    overallRating: 5,
    tips: ['Extremely safe, even late at night', 'Lost items often returned', 'Follow local customs and etiquette'],
    areas: [
      { name: 'Shibuya/Shinjuku', safe: true, note: 'Safe, can be crowded' },
      { name: 'Asakusa', safe: true, note: 'Traditional area, very safe' },
      { name: 'Kabukicho', safe: false, note: 'Entertainment district — be street smart' },
    ],
    vaccinations: 'None required',
    waterSafety: 'Tap water is safe to drink',
  },
  'Dubai': {
    overallRating: 5,
    tips: ['Very low crime rate', 'Dress modestly outside beach/hotel areas', 'Alcohol only in licensed venues'],
    areas: [
      { name: 'Downtown/Marina', safe: true, note: 'Premium, heavily monitored' },
      { name: 'Jumeirah', safe: true, note: 'Upscale beach area' },
      { name: 'Deira', safe: true, note: 'Older area, generally safe' },
    ],
    vaccinations: 'None required',
    waterSafety: 'Tap water is safe but bottled preferred',
  },
  'Bangkok': {
    overallRating: 3,
    tips: ['Watch for tuk-tuk scams', 'Use metered taxis or Grab app', 'Stay hydrated in the heat'],
    areas: [
      { name: 'Sukhumvit', safe: true, note: 'Tourist-friendly, modern' },
      { name: 'Khao San Road', safe: true, note: 'Backpacker hub, lively' },
      { name: 'Klong Toei', safe: false, note: 'Avoid at night' },
    ],
    vaccinations: 'Hepatitis A recommended',
    waterSafety: 'Drink bottled water only',
  },
  'Bali': {
    overallRating: 4,
    tips: ['Beware of aggressive dogs', 'Use grab for transport', 'Bargain at markets'],
    areas: [
      { name: 'Seminyak/Canggu', safe: true, note: 'Popular, well-touristed' },
      { name: 'Ubud', safe: true, note: 'Very safe, cultural center' },
      { name: 'Kuta at night', safe: false, note: 'Tourist party area — stay alert' },
    ],
    vaccinations: 'Hepatitis A, Typhoid recommended',
    waterSafety: 'Drink bottled water only',
  },
  'Barcelona': {
    overallRating: 4,
    tips: ['Pickpockets active on La Rambla', 'Secure belongings on the beach', 'Use official taxis'],
    areas: [
      { name: 'Eixample/Gràcia', safe: true, note: 'Safe residential areas' },
      { name: 'Gothic Quarter', safe: true, note: 'Beautiful but watch valuables' },
      { name: 'El Raval at night', safe: false, note: 'Exercise caution' },
    ],
    vaccinations: 'None required',
    waterSafety: 'Tap water is safe but tastes chlorinated',
  },
  'Rome': {
    overallRating: 4,
    tips: ['Watch for pickpockets around Colosseum/Vatican', 'Avoid restaurants right on tourist squares', 'Carry cash for small shops'],
    areas: [
      { name: 'Centro Storico', safe: true, note: 'Historic center, generally safe' },
      { name: 'Trastevere', safe: true, note: 'Charming, safe evening dining' },
      { name: 'Termini area', safe: false, note: 'Busy, watch belongings' },
    ],
    vaccinations: 'None required',
    waterSafety: 'Tap water is safe (nasoni fountains!)',
  },
  'New York': {
    overallRating: 4,
    tips: ['Safe overall, use common sense', 'Keep phones secure on subway', 'Walk confidently — avoid looking lost'],
    areas: [
      { name: 'Midtown/Upper East', safe: true, note: 'Well-policed, very safe' },
      { name: 'Brooklyn (Park Slope)', safe: true, note: 'Family-friendly, safe' },
      { name: 'East Harlem at night', safe: false, note: 'Stick to main avenues' },
    ],
    vaccinations: 'None required',
    waterSafety: 'Tap water is excellent to drink',
  },
};

export default function SafetyInfo({ city, className = '' }: SafetyInfoProps) {
  const staticData = useMemo(() => SAFETY[city], [city]);
  const [liveData, setLiveData] = useState<SafetyData | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/travel-guide?city=${encodeURIComponent(city)}&section=safety`)
      .then((res) => res.json())
      .then((result) => {
        if (cancelled) return;
        if (result.data && result.data.tips && result.data.tips.length > 0) {
          setLiveData(result.data);
          setIsLive(true);
        }
      })
      .catch(() => { /* use static fallback */ });

    return () => { cancelled = true; };
  }, [city]);

  const data = liveData || staticData;

  if (!data) return null;

  const stars = '⭐'.repeat(data.overallRating) + '☆'.repeat(5 - data.overallRating);

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">Safety in {city}</h3>
          {isLive && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
              Wikivoyage
            </span>
          )}
        </div>
        <span className="text-sm" title={`${data.overallRating}/5`}>{stars}</span>
      </div>

      <div className="space-y-3">
        {/* Tips */}
        <div>
          <h4 className="text-[10px] text-slate-400 uppercase font-bold mb-1.5">Tips</h4>
          <ul className="space-y-1">
            {data.tips.map((tip) => (
              <li key={tip} className="text-xs text-slate-600 flex items-start gap-1.5">
                <span className="text-green-500 mt-0.5">✓</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Areas */}
        <div>
          <h4 className="text-[10px] text-slate-400 uppercase font-bold mb-1.5">Areas</h4>
          <div className="space-y-1">
            {data.areas.map((area) => (
              <div key={area.name} className="flex items-center gap-2 text-xs">
                <span className={area.safe ? 'text-green-500' : 'text-amber-500'}>
                  {area.safe ? '✓' : '⚠️'}
                </span>
                <span className="font-medium text-slate-700">{area.name}</span>
                <span className="text-slate-400">— {area.note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Health */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-slate-50 rounded-lg">
            <p className="text-[10px] text-slate-400">Vaccinations</p>
            <p className="text-xs text-slate-700 font-medium">{data.vaccinations}</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <p className="text-[10px] text-slate-400">Water</p>
            <p className="text-xs text-slate-700 font-medium">{data.waterSafety}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
