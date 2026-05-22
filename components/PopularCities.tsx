import Link from 'next/link';
import Image from 'next/image';
import { listCities, getHotelsByCity } from '@/lib/hotels-catalog';

const FEATURED_CITIES = ['Paris', 'London', 'Tokyo', 'Dubai', 'New York', 'Bangkok', 'Barcelona', 'Rome'];

export default function PopularCities() {
  const cities = FEATURED_CITIES.filter((c) => listCities().includes(c)).slice(0, 8);

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">
        Featured catalog destinations
      </h2>
      <p className="text-center text-slate-500 mb-8">
        Browse cities that currently have verified catalog hotel entries.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cities.map((city) => {
          const hotels = getHotelsByCity(city);
          const count = hotels.length;
          const image = hotels[0]?.image;
          return (
            <Link
              key={city}
              href={`/city/${encodeURIComponent(city)}`}
              className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-slate-200"
            >
              {image && (
                <Image
                  src={image}
                  alt={`Hotels in ${city}`}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="font-bold text-lg drop-shadow-lg">{city}</h3>
                <p className="text-sm text-white/80">
                  {count} hotel{count !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
