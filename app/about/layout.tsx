import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about SV Booking — our mission to help travelers find the best hotel deals by comparing prices across 8+ providers in 45+ cities worldwide.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
