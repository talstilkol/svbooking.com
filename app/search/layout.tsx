import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find Hotels',
  description: 'Search and compare hotel prices from Booking.com, Expedia, Hotels.com, Agoda and more. Find the best deals across multiple providers.',
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
