import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Price Comparison',
  description: 'Compare real-time hotel prices from Booking.com, Expedia, Hotels.com, Agoda, Vio.com and Trip.com. Find the cheapest rate instantly.',
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
