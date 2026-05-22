import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Price Comparison',
  description: 'Compare provider-returned hotel prices from configured sources when rates are available.',
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
