import { listCities, getHotelsByCity } from '@/lib/hotels-catalog';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { BreadcrumbJsonLd, ItemListJsonLd } from '@/components/JsonLd';
import CityGuide from '@/components/CityGuide';
import LocalEvents from '@/components/LocalEvents';
import SafetyInfo from '@/components/SafetyInfo';
import FlightDataNotice from '@/components/FlightDataNotice';
import RatingBadge from '@/components/RatingBadge';
import DestinationIntel from '@/components/DestinationIntel';
import { CityHero, CityCompareCta, OtherCitiesHeading } from '@/components/CityLabels';

type Props = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const city = decodeURIComponent(name);
  const hotels = getHotelsByCity(city);
  const count = hotels.length;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://svbooking.com';
  const ogImage = `${baseUrl}/api/og?title=${encodeURIComponent(`Hotels in ${city}`)}&subtitle=${encodeURIComponent(`Compare provider-returned prices when available`)}`;

  return {
    title: `Hotels in ${city} — Compare Provider Prices | SVBooking`,
    description: `Compare available provider-returned prices for ${count} catalog hotels in ${city}. Rates and availability are shown only when verified data exists.`,
    alternates: { canonical: `/city/${encodeURIComponent(city)}` },
    robots: { index: count > 0, follow: count > 0 },
    openGraph: {
      title: `${count} Hotels in ${city}`,
      description: `Compare hotel prices in ${city} from available providers`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `Hotels in ${city}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Hotels in ${city}`,
      description: `Compare ${count} hotel prices in ${city}`,
      images: [ogImage],
    },
  };
}

export const revalidate = 86400;

export function generateStaticParams() {
  return listCities().map((city) => ({ name: encodeURIComponent(city) }));
}

export default async function CityPage({ params }: Props) {
  const { name } = await params;
  const city = decodeURIComponent(name);
  const hotels = getHotelsByCity(city);
  if (hotels.length === 0) notFound();
  const country = hotels[0]?.country || '';

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://svbooking.com';

  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: baseUrl },
          { name: 'Hotels', url: `${baseUrl}/search` },
          { name: city, url: `${baseUrl}/city/${encodeURIComponent(city)}` },
        ]}
      />
      <ItemListJsonLd
        name={`Hotels in ${city}`}
        items={hotels.map((h) => ({
          name: h.name,
          url: `${baseUrl}/hotel/${h.hotelKey}`,
          image: h.image,
        }))}
      />
      {/* Hero */}
      <div className="relative h-48 md:h-64 bg-zinc-900 overflow-hidden">
        {hotels[0] && (
          <Image
            src={hotels[0].image}
            alt={`Hotels in ${city}`}
            fill
            className="object-cover opacity-70"
            sizes="100vw"
            priority
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
        <CityHero city={city} country={country} count={hotels.length} />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hotels.map((hotel) => (
            <Link
              key={hotel.hotelKey}
              href={`/hotel/${hotel.hotelKey}`}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-blue-200 transition-all group flex"
            >
              <div className="relative w-36 md:w-48 shrink-0">
                <Image
                  src={hotel.image}
                  alt={hotel.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 144px, 192px"
                />
              </div>
              <div className="p-4 flex-1 min-w-0">
                <h2 className="font-bold text-slate-900 truncate">{hotel.name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">📍 {hotel.city}, {hotel.country}</p>
                <RatingBadge size="sm" className="mt-1.5" />
                <CityCompareCta />
              </div>
            </Link>
          ))}
        </div>

        {/* Destination intelligence */}
        <DestinationIntel city={city} country={country} className="mt-8" />

        {/* City guide + Travel info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <CityGuide city={city} />
          <SafetyInfo city={city} />
          <LocalEvents city={city} />
          <FlightDataNotice city={city} />
        </div>

        {/* Cross-links to other cities in same country */}
        {country && (
          <div className="mt-12">
            <OtherCitiesHeading country={country} />
            <div className="flex flex-wrap gap-2">
              {listCities()
                .filter((c) => {
                  const h = getHotelsByCity(c);
                  return h[0]?.country === country && c !== city;
                })
                .map((c) => (
                  <Link
                    key={c}
                    href={`/city/${encodeURIComponent(c)}`}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    {c}
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
