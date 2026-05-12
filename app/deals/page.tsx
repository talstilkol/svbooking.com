import type { Metadata } from 'next';
import DealsClient from '@/components/DealsClient';

export const metadata: Metadata = {
  title: "Today's Best Hotel Deals — Compare Prices | SVBooking",
  description:
    'Live hotel deals scanned by our AI agents. Find the cheapest rates from Booking.com, Expedia, Hotels.com, Agoda & more across 20 cities worldwide.',
  openGraph: {
    title: "Today's Best Hotel Deals | SVBooking",
    description:
      'AI-powered deal scanner finds the cheapest hotel rates across 8+ providers.',
    type: 'website',
  },
};

export default function DealsPage() {
  return <DealsClient />;
}
