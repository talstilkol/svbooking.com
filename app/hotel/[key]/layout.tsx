import type { Metadata } from 'next';
import { findHotel } from '@/lib/hotels-catalog';
import { LodgingJsonLd, BreadcrumbJsonLd } from '@/components/JsonLd';

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
      description: 'This hotel could not be found. Browse our catalog of 130+ hotels.',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://my-app-alpha-one-28.vercel.app';
  const title = `${hotel.name} — Compare Prices | SVBooking`;
  const description = `Compare live prices for ${hotel.name} in ${hotel.city}, ${hotel.country} from Booking.com, Expedia, Hotels.com, Agoda & more. Find the cheapest rate.`;
  const ogImage = `${baseUrl}/api/og?hotelKey=${encodeURIComponent(key)}`;

  return {
    title,
    description,
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
      title: `${hotel.name} — Best Prices`,
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
