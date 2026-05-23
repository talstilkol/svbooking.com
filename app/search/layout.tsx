import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Hotels',
  description: 'Search and compare hotel prices across multiple providers. Find the best rates for your next trip.',
  alternates: { canonical: '/search' },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
