import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offline',
  description: 'You are currently offline. Some features require an internet connection.',
  alternates: { canonical: '/offline' },
  robots: { index: false, follow: false },
};

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
