import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hotel Deals',
  description: 'Browse the latest hotel deals and provider-returned rates. Compare prices from multiple booking providers to find the best value.',
  alternates: { canonical: '/deals' },
};

export default function DealsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
