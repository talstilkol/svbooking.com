import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hotels by City',
  description: 'Browse and compare hotel prices in top travel destinations. Find available provider deals.',
};

export default function CityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
