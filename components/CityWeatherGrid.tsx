import Link from 'next/link';
import { getHotelsByCity } from '@/lib/hotels-catalog';

interface CityWeatherInfo {
  city: string;
  hotelCount: number;
}

const FEATURED_CITIES = ['Tel Aviv', 'Paris', 'London', 'Tokyo', 'Dubai', 'Bangkok', 'Bali', 'Barcelona', 'Rome', 'New York'];

const CITIES: CityWeatherInfo[] = FEATURED_CITIES.map((city) => ({
  city,
  hotelCount: getHotelsByCity(city).length,
}));

export default function CityWeatherGrid({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Catalog city coverage</h2>
      <p className="text-sm text-slate-500 mb-5">
        Verified catalog hotel counts for selected destinations. Live weather is shown only on pages backed by the weather API.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {CITIES.map((c) => (
          <Link
            key={c.city}
            href={`/search?city=${encodeURIComponent(c.city)}`}
            className="bg-white rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500">Catalog</span>
              <span className="text-lg font-bold text-slate-700">{c.hotelCount}</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition">
              {c.city}
            </h3>
            <p className="text-[10px] text-blue-600 mt-1">
              verified catalog hotel{c.hotelCount !== 1 ? 's' : ''}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
