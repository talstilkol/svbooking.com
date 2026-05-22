import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with SV Booking. We\'d love to hear your feedback, partnership inquiries, or support questions.',
  alternates: { canonical: '/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: 'https://svbooking.com' },
        { name: 'Contact', url: 'https://svbooking.com/contact' },
      ]} />
      {children}
    </>
  );
}
