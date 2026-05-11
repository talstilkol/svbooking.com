import Link from 'next/link';

interface CityWeatherInfo {
  city: string;
  temp: number;
  icon: string;
  label: string;
  hotelCount: number;
}

const CITIES: CityWeatherInfo[] = [
  { city: 'Tel Aviv', temp: 26, icon: '☀️', label: 'Sunny', hotelCount: 4 },
  { city: 'Paris', temp: 17, icon: '🌤️', label: 'Pleasant', hotelCount: 5 },
  { city: 'London', temp: 15, icon: '⛅', label: 'Mild', hotelCount: 5 },
  { city: 'Tokyo', temp: 21, icon: '🌸', label: 'Warm', hotelCount: 4 },
  { city: 'Dubai', temp: 35, icon: '🔥', label: 'Hot', hotelCount: 4 },
  { city: 'Bangkok', temp: 32, icon: '🌧️', label: 'Tropical', hotelCount: 3 },
  { city: 'Bali', temp: 27, icon: '🌴', label: 'Warm', hotelCount: 3 },
  { city: 'Barcelona', temp: 22, icon: '☀️', label: 'Sunny', hotelCount: 3 },
  { city: 'Rome', temp: 20, icon: '🌤️', label: 'Pleasant', hotelCount: 3 },
  { city: 'New York', temp: 18, icon: '⛅', label: 'Mild', hotelCount: 4 },
];

export default function CityWeatherGrid({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">🌍 Where to go now</h2>
      <p className="text-sm text-slate-500 mb-5">
        Current weather and hotel availability across our top destinations
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {CITIES.map((c) => (
          <Link
            key={c.city}
            href={`/search?city=${encodeURIComponent(c.city)}`}
            className="bg-white rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xl">{c.icon}</span>
              <span className="text-lg font-bold text-slate-700">{c.temp}°</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition">
              {c.city}
            </h3>
            <p className="text-[10px] text-slate-400">{c.label}</p>
            <p className="text-[10px] text-blue-500 mt-1">
              {c.hotelCount} hotel{c.hotelCount !== 1 ? 's' : ''}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
