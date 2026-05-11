import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hotel Detail — Compare Prices | SVBooking',
  description: 'Compare live hotel prices from Booking.com, Expedia, Hotels.com, Agoda and more. Find the cheapest rate in seconds.',
};

export default function HotelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
