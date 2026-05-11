'use client';

import { useMemo } from 'react';

interface WeatherWidgetProps {
  city: string;
  checkIn?: string;
  className?: string;
}

interface MonthWeather {
  temp: number;
  icon: string;
  label: string;
}

// Average temperature data by city and month (approximate)
const CITY_WEATHER: Record<string, MonthWeather[]> = {
  'Tel Aviv': [
    { temp: 18, icon: '⛅', label: 'Mild' }, { temp: 18, icon: '⛅', label: 'Mild' },
    { temp: 20, icon: '🌤️', label: 'Pleasant' }, { temp: 23, icon: '☀️', label: 'Warm' },
    { temp: 26, icon: '☀️', label: 'Hot' }, { temp: 29, icon: '🔥', label: 'Hot' },
    { temp: 31, icon: '🔥', label: 'Very Hot' }, { temp: 31, icon: '🔥', label: 'Very Hot' },
    { temp: 29, icon: '☀️', label: 'Hot' }, { temp: 26, icon: '☀️', label: 'Warm' },
    { temp: 22, icon: '🌤️', label: 'Pleasant' }, { temp: 19, icon: '⛅', label: 'Mild' },
  ],
  'Paris': [
    { temp: 5, icon: '❄️', label: 'Cold' }, { temp: 6, icon: '❄️', label: 'Cold' },
    { temp: 10, icon: '⛅', label: 'Cool' }, { temp: 13, icon: '🌤️', label: 'Mild' },
    { temp: 17, icon: '🌤️', label: 'Pleasant' }, { temp: 20, icon: '☀️', label: 'Warm' },
    { temp: 23, icon: '☀️', label: 'Warm' }, { temp: 23, icon: '☀️', label: 'Warm' },
    { temp: 19, icon: '🌤️', label: 'Pleasant' }, { temp: 14, icon: '⛅', label: 'Cool' },
    { temp: 9, icon: '🌧️', label: 'Cool' }, { temp: 6, icon: '❄️', label: 'Cold' },
  ],
  'London': [
    { temp: 5, icon: '🌧️', label: 'Cold' }, { temp: 6, icon: '🌧️', label: 'Cold' },
    { temp: 8, icon: '⛅', label: 'Cool' }, { temp: 11, icon: '⛅', label: 'Mild' },
    { temp: 15, icon: '🌤️', label: 'Pleasant' }, { temp: 18, icon: '🌤️', label: 'Warm' },
    { temp: 21, icon: '☀️', label: 'Warm' }, { temp: 21, icon: '☀️', label: 'Warm' },
    { temp: 17, icon: '⛅', label: 'Mild' }, { temp: 13, icon: '🌧️', label: 'Cool' },
    { temp: 9, icon: '🌧️', label: 'Cool' }, { temp: 6, icon: '🌧️', label: 'Cold' },
  ],
  'Tokyo': [
    { temp: 6, icon: '❄️', label: 'Cold' }, { temp: 7, icon: '⛅', label: 'Cold' },
    { temp: 11, icon: '🌸', label: 'Cherry Blossom' }, { temp: 16, icon: '🌤️', label: 'Pleasant' },
    { temp: 21, icon: '☀️', label: 'Warm' }, { temp: 24, icon: '🌧️', label: 'Rainy' },
    { temp: 28, icon: '🔥', label: 'Hot & Humid' }, { temp: 30, icon: '🔥', label: 'Very Hot' },
    { temp: 25, icon: '🌤️', label: 'Pleasant' }, { temp: 19, icon: '🍂', label: 'Autumn' },
    { temp: 13, icon: '⛅', label: 'Cool' }, { temp: 8, icon: '❄️', label: 'Cold' },
  ],
  'Dubai': [
    { temp: 21, icon: '☀️', label: 'Warm' }, { temp: 22, icon: '☀️', label: 'Warm' },
    { temp: 26, icon: '☀️', label: 'Hot' }, { temp: 30, icon: '🔥', label: 'Hot' },
    { temp: 35, icon: '🔥', label: 'Very Hot' }, { temp: 38, icon: '🔥', label: 'Extreme' },
    { temp: 41, icon: '🔥', label: 'Extreme' }, { temp: 41, icon: '🔥', label: 'Extreme' },
    { temp: 37, icon: '🔥', label: 'Very Hot' }, { temp: 33, icon: '☀️', label: 'Hot' },
    { temp: 27, icon: '☀️', label: 'Warm' }, { temp: 23, icon: '☀️', label: 'Pleasant' },
  ],
  'Bangkok': [
    { temp: 28, icon: '☀️', label: 'Hot' }, { temp: 30, icon: '☀️', label: 'Hot' },
    { temp: 32, icon: '🔥', label: 'Very Hot' }, { temp: 34, icon: '🔥', label: 'Hottest' },
    { temp: 33, icon: '🌧️', label: 'Rainy' }, { temp: 32, icon: '🌧️', label: 'Rainy' },
    { temp: 31, icon: '🌧️', label: 'Rainy' }, { temp: 31, icon: '🌧️', label: 'Rainy' },
    { temp: 31, icon: '🌧️', label: 'Rainy' }, { temp: 30, icon: '🌧️', label: 'Rainy' },
    { temp: 29, icon: '⛅', label: 'Pleasant' }, { temp: 27, icon: '☀️', label: 'Warm' },
  ],
  'Bali': [
    { temp: 27, icon: '🌧️', label: 'Wet' }, { temp: 27, icon: '🌧️', label: 'Wet' },
    { temp: 28, icon: '🌧️', label: 'Wet' }, { temp: 28, icon: '🌤️', label: 'Warm' },
    { temp: 27, icon: '☀️', label: 'Dry' }, { temp: 26, icon: '☀️', label: 'Dry' },
    { temp: 26, icon: '☀️', label: 'Best' }, { temp: 26, icon: '☀️', label: 'Best' },
    { temp: 27, icon: '☀️', label: 'Dry' }, { temp: 28, icon: '🌤️', label: 'Warm' },
    { temp: 28, icon: '🌧️', label: 'Wet' }, { temp: 27, icon: '🌧️', label: 'Wet' },
  ],
};

export default function WeatherWidget({
  city,
  checkIn,
  className = '',
}: WeatherWidgetProps) {
  const data = useMemo(() => {
    const weather = CITY_WEATHER[city];
    if (!weather) return null;

    const targetMonth = checkIn
      ? new Date(checkIn).getMonth()
      : new Date().getMonth();

    const current = weather[targetMonth];
    const monthName = new Date(2024, targetMonth).toLocaleString('en-US', {
      month: 'long',
    });

    // Best months to visit (lowest temps for hot cities, highest for cold)
    const avgTemp =
      weather.reduce((s, w) => s + w.temp, 0) / 12;
    const bestMonths = weather
      .map((w, i) => ({ ...w, month: i }))
      .filter((w) => {
        if (avgTemp > 25) return w.temp < avgTemp; // hot city: cooler months
        return w.temp > avgTemp; // cold city: warmer months
      })
      .sort((a, b) =>
        avgTemp > 25 ? a.temp - b.temp : b.temp - a.temp
      )
      .slice(0, 3);

    return { current, monthName, bestMonths, weather, targetMonth };
  }, [city, checkIn]);

  if (!data) return null;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        🌤️ Weather in {city}
      </h3>

      {/* Current/target month */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
        <span className="text-3xl">{data.current.icon}</span>
        <div>
          <p className="text-2xl font-bold text-slate-800">
            {data.current.temp}°C
          </p>
          <p className="text-xs text-slate-500">
            {data.monthName} · {data.current.label}
          </p>
        </div>
      </div>

      {/* Mini calendar */}
      <div className="grid grid-cols-6 gap-1.5 mb-3">
        {data.weather.slice(0, 12).map((w, i) => {
          const isTarget = i === data.targetMonth;
          return (
            <div
              key={i}
              className={`text-center p-1.5 rounded ${
                isTarget
                  ? 'bg-blue-100 ring-1 ring-blue-300'
                  : 'bg-slate-50'
              }`}
              title={`${new Date(2024, i).toLocaleString('en-US', { month: 'short' })}: ${w.temp}°C`}
            >
              <span className="text-[10px] block text-slate-400">
                {new Date(2024, i).toLocaleString('en-US', { month: 'short' }).slice(0, 1)}
              </span>
              <span className="text-xs font-medium text-slate-600">
                {w.temp}°
              </span>
            </div>
          );
        })}
      </div>

      {/* Best months */}
      <div className="text-xs text-slate-500">
        <span className="font-medium">Best time to visit:</span>{' '}
        {data.bestMonths
          .map((m) =>
            new Date(2024, m.month).toLocaleString('en-US', { month: 'long' })
          )
          .join(', ')}
      </div>
    </div>
  );
}
