import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hotels by City',
  description: 'Browse and compare hotel prices in top travel destinations. Find the best deals from 8+ providers.',
};

export default function CityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
