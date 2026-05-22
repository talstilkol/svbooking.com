import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Destinations',
  description: 'Browse hotel deals by continent, country, and city. Discover available provider rates for your next trip across Europe, Asia, Middle East and Americas.',
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
