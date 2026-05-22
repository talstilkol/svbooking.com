import type { Metadata } from 'next';
import { findHotel } from '@/lib/hotels-catalog';
import { LodgingJsonLd, BreadcrumbJsonLd } from '@/components/JsonLd';
import { CATALOG_STATS } from '@/lib/catalog-stats';

type Props = {
  params: Promise<{ key: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  const hotel = findHotel(key);

  if (!hotel) {
    return {
      title: 'Hotel Not Found | SVBooking',
      description: `This hotel could not be found. Browse our catalog of ${CATALOG_STATS.hotels} hotels.`,
      robots: { index: false, follow: false },
    };
  }

  const catalogHotel = hotel as typeof hotel & {
    discovered?: boolean;
    provenance?: unknown;
    sourceUrl?: string | null;
  };
  const indexable = !catalogHotel.discovered || Boolean(catalogHotel.provenance || catalogHotel.sourceUrl);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://svbooking.com';
  const title = `${hotel.name} — Compare Prices | SVBooking`;
  const description = `Compare provider-returned prices for ${hotel.name} in ${hotel.city}, ${hotel.country} when verified rate data is available.`;
  const ogImage = `${baseUrl}/api/og?hotelKey=${encodeURIComponent(key)}`;

  return {
    title,
    description,
    alternates: { canonical: `/hotel/${key}` },
    robots: { index: indexable, follow: indexable },
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        { url: ogImage, width: 1200, height: 630, alt: `${hotel.name} price comparison` },
        { url: hotel.image, width: 800, height: 600, alt: hotel.name },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${hotel.name} — Compare Prices`,
      description: `Compare prices for ${hotel.name} in ${hotel.city}`,
      images: [ogImage],
    },
  };
}

export default async function HotelLayout({ params, children }: Props) {
  const { key } = await params;
  const hotel = findHotel(key);

  return (
    <>
      {hotel && (
        <>
          <BreadcrumbJsonLd
            items={[
              { name: 'Home', url: 'https://svbooking.com' },
              { name: hotel.city, url: `https://svbooking.com/city/${encodeURIComponent(hotel.city)}` },
              { name: hotel.name, url: `https://svbooking.com/hotel/${key}` },
            ]}
          />
          <LodgingJsonLd
            name={hotel.name}
            city={hotel.city}
            country={hotel.country}
            image={hotel.image}
          />
        </>
      )}
      {children}
    </>
  );
}
