import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Favorites',
  description: 'Your saved favorite hotels. Quick access to compare prices and plan trips.',
  robots: { index: false, follow: false },
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
