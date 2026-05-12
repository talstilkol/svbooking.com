import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Book Hotel',
  description: 'Complete your hotel booking. Compare final prices from Booking.com, Expedia, Hotels.com, Agoda and more before you book.',
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
