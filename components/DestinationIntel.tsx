'use client';

import { useState, useEffect } from 'react';

interface DestinationIntelProps {
  city: string;
  country?: string;
  checkIn?: string;
  checkOut?: string;
  className?: string;
}

interface IntelData {
  description?: string;
  image?: string;
  weather?: Array<{ date: string; tempMax: number; tempMin: number; icon: string; weather: string }>;
  holidays?: Array<{ date: string; name: string; localName: string }>;
  localCurrency?: { code: string; symbol: string; rate: number; example: string };
  daylight?: { sunrise: string; sunset: string; hours: number };
  hotelsAvailable?: number;
}

/**
 * Shows destination intelligence for a city: weather, holidays, currency, daylight.
 * Uses the aggregated /api/destination-intel endpoint (6 free sources, no auth).
 */
export default function DestinationIntel({
  city,
  country,
  checkIn,
  checkOut,
  className = '',
}: DestinationIntelProps) {
  const [data, setData] = useState<IntelData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setData(null);
    });

    const params = new URLSearchParams({ city });
    if (country) params.set('country', country);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);

    fetch(`/api/destination-intel?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [city, country, checkIn, checkOut]);

  if (!city || loading || !data) return null;

  const hasWeather = data.weather && data.weather.length > 0;
  const hasHolidays = data.holidays && data.holidays.length > 0;
  const hasCurrency = data.localCurrency;
  const hasDaylight = data.daylight;

  if (!hasWeather && !hasHolidays && !hasCurrency && !hasDaylight) return null;

  return (
    <div className={`bg-white border border-zinc-200 rounded-lg p-4 ${className}`}>
      <h3 className="font-semibold text-zinc-900 mb-3">
        Travel Intel for {city}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Weather */}
        {hasWeather && (
          <div className="bg-sky-50 rounded-lg p-3">
            <p className="text-xs font-medium text-sky-800 mb-1.5">Weather Forecast</p>
            <div className="space-y-1">
              {data.weather!.slice(0, 3).map((day) => (
                <div key={day.date} className="flex items-center justify-between text-xs">
                  <span className="text-sky-700">
                    {day.icon} {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="text-sky-600 font-medium">
                    {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Holidays */}
        {hasHolidays && (
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-800 mb-1.5">Public Holidays</p>
            <div className="space-y-1">
              {data.holidays!.slice(0, 3).map((h) => (
                <div key={h.date} className="text-xs">
                  <span className="text-amber-700 font-medium">
                    {new Date(h.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-amber-600 ml-1">{h.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Currency */}
        {hasCurrency && (
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs font-medium text-emerald-800 mb-1.5">Local Currency</p>
            <p className="text-lg font-bold text-emerald-700">
              {data.localCurrency!.symbol} {data.localCurrency!.code}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              {data.localCurrency!.example}
            </p>
          </div>
        )}

        {/* Daylight */}
        {hasDaylight && (
          <div className="bg-orange-50 rounded-lg p-3">
            <p className="text-xs font-medium text-orange-800 mb-1.5">Daylight Hours</p>
            <p className="text-lg font-bold text-orange-700">
              {data.daylight!.hours}h
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Sunrise {data.daylight!.sunrise} &bull; Sunset {data.daylight!.sunset}
            </p>
          </div>
        )}
      </div>

      {/* Hotels available */}
      {data.hotelsAvailable != null && data.hotelsAvailable > 0 && (
        <p className="text-xs text-zinc-400 mt-2">
          {data.hotelsAvailable} hotels in our catalog for {city}
        </p>
      )}
    </div>
  );
}
