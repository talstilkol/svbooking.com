import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Trips',
  description: 'Plan your trips and let AI find the best hotel prices. Get personalized recommendations and cheaper date alternatives.',
};

export default function TripsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
