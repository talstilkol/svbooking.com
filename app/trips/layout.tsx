import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Trips',
  description: 'Plan trips, compare available provider prices, and review cheaper date alternatives when verified rate data exists.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/trips' },
};

export default function TripsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
