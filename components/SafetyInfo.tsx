'use client';

import { useState, useEffect } from 'react';

interface SafetyInfoProps {
  city: string;
  className?: string;
}

interface SafetyData {
  tips?: string[];
  areas?: { name: string; safe: boolean; note: string }[];
  vaccinations?: string;
  waterSafety?: string;
}

function hasSafetyData(data: SafetyData | null): data is SafetyData {
  return Boolean(
    data &&
    ((Array.isArray(data.tips) && data.tips.length > 0) ||
      (Array.isArray(data.areas) && data.areas.length > 0) ||
      data.vaccinations ||
      data.waterSafety)
  );
}

export default function SafetyInfo({ city, className = '' }: SafetyInfoProps) {
  const [data, setData] = useState<SafetyData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/travel-guide?city=${encodeURIComponent(city)}&section=safety`)
      .then((res) => res.json())
      .then((result) => {
        if (cancelled) return;
        if (hasSafetyData(result.data)) {
          setData(result.data);
        }
      })
      .catch(() => { /* safety data unavailable */ })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => { cancelled = true; };
  }, [city]);

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">Safety in {city}</h3>
          {data && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
              Wikivoyage
            </span>
          )}
        </div>
      </div>

      {data ? (
        <div className="space-y-3">
          {Array.isArray(data.tips) && data.tips.length > 0 && (
            <div>
              <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-1.5">Tips</h4>
              <ul className="space-y-1">
                {data.tips.map((tip) => (
                  <li key={tip} className="text-xs text-slate-600 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">+</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(data.areas) && data.areas.length > 0 && (
            <div>
              <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-1.5">Areas</h4>
              <div className="space-y-1">
                {data.areas.map((area) => (
                  <div key={area.name} className="flex items-center gap-2 text-xs">
                    <span className={area.safe ? 'text-green-500' : 'text-amber-500'}>
                      {area.safe ? '+' : '!'}
                    </span>
                    <span className="font-medium text-slate-700">{area.name}</span>
                    <span className="text-slate-500">- {area.note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(data.vaccinations || data.waterSafety) && (
            <div className="grid grid-cols-2 gap-2">
              {data.vaccinations && (
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-500">Vaccinations</p>
                  <p className="text-xs text-slate-700 font-medium">{data.vaccinations}</p>
                </div>
              )}
              {data.waterSafety && (
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-500">Water</p>
                  <p className="text-xs text-slate-700 font-medium">{data.waterSafety}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          {loaded ? 'Verified safety guidance is unavailable for this city.' : 'Checking verified safety guidance...'}
        </p>
      )}
    </div>
  );
}
