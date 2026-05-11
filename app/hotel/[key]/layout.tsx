import type { Metadata } from 'next';
import { findHotel } from '@/lib/hotels-catalog';
import { LodgingJsonLd } from '@/components/JsonLd';

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
      description: 'This hotel could not be found. Browse our catalog of 63+ hotels.',
    };
  }

  const title = `${hotel.name} — Compare Prices | SVBooking`;
  const description = `Compare live prices for ${hotel.name} in ${hotel.city}, ${hotel.country} from Booking.com, Expedia, Hotels.com, Agoda & more. Find the cheapest rate.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: hotel.image, width: 800, height: 600, alt: hotel.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${hotel.name} — Best Prices`,
      description: `Compare prices for ${hotel.name} in ${hotel.city}`,
      images: [hotel.image],
    },
  };
}

export default async function HotelLayout({ params, children }: Props) {
  const { key } = await params;
  const hotel = findHotel(key);

  return (
    <>
      {hotel && (
        <LodgingJsonLd
          name={hotel.name}
          city={hotel.city}
          country={hotel.country}
          image={hotel.image}
        />
      )}
      {children}
    </>
  );
}
