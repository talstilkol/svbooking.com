import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plan Hotel Trip',
  description: 'Save trip details and review provider-returned prices when available.',
  alternates: { canonical: '/book' },
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
