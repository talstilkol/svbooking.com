import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compare Hotels Side by Side',
  description: 'Select up to 4 hotels and compare their prices side by side across Booking.com, Expedia, Hotels.com, Agoda, and more providers.',
};

export default function CompareHotelsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
