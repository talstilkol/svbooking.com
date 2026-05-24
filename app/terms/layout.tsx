import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'SV Booking terms of service. Read about your rights and obligations when using our hotel price comparison platform.',
  alternates: { canonical: '/terms' },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: 'https://svbooking.com' },
        { name: 'Terms of Service', url: 'https://svbooking.com/terms' },
      ]} />
      {children}
    </>
  );
}
