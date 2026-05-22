import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about SV Booking — our mission to help travelers compare verified hotel prices across a curated global catalog.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
