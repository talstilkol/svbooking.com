import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Today\'s Best Hotel Deals',
  description: 'Live hotel deals scanned by our AI agents. Find the cheapest rates from Booking.com, Expedia, Hotels.com, Agoda & more across 20 cities worldwide.',
};

export default function DealsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
