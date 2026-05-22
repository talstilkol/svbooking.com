'use client';

import { useEffect, useState } from 'react';

interface ForecastDay {
  date: string;
  tempMin: number;
  tempMax: number;
  icon: string;
  rainChance?: number;
}

interface WeatherWidgetProps {
  city: string;
  checkIn?: string;
  className?: string;
}

export default function WeatherWidget({
  city,
  checkIn,
  className = '',
}: WeatherWidgetProps) {
  void checkIn;
  const [forecast, setForecast] = useState<ForecastDay[] | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLiveLoading(true);
    });

    fetch(`/api/weather?city=${encodeURIComponent(city)}&days=7`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.daily?.length) setForecast(d.daily);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLiveLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [city]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (liveLoading) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Weather in {city}
        </h3>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!forecast || forecast.length === 0) return null;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-700 mb-1">
        Weather in {city}
      </h3>
      <p className="text-[10px] text-slate-400 mb-3">Live 7-day forecast via Open-Meteo</p>

      <div className="space-y-1.5">
        {forecast.map((day) => (
          <div
            key={day.date}
            className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg"
          >
            <span className="text-lg w-7 text-center">{day.icon}</span>
            <span className="text-xs text-slate-600 w-24 shrink-0 font-medium">
              {formatDate(day.date)}
            </span>
            <div className="flex-1 flex items-center gap-1.5">
              <span className="text-xs text-blue-600 font-medium w-7 text-right">
                {Math.round(day.tempMin)}°
              </span>
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full relative overflow-hidden">
                <div
                  className="absolute inset-y-0 bg-linear-to-r from-blue-400 to-orange-400 rounded-full"
                  style={{
                    left: `${Math.max(0, ((day.tempMin + 10) / 50) * 100)}%`,
                    right: `${Math.max(0, 100 - ((day.tempMax + 10) / 50) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-orange-600 font-medium w-7">
                {Math.round(day.tempMax)}°
              </span>
            </div>
            {(day.rainChance || 0) > 20 && (
              <span className="text-[10px] text-blue-500 font-medium w-10 text-right">
                {day.rainChance}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
