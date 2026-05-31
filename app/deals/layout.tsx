import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hotel Deals',
  description: 'Browse provider-returned hotel rates and compare available prices from configured booking providers.',
  alternates: { canonical: '/deals' },
};

export default function DealsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
