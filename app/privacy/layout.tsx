import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'SV Booking privacy policy. Learn how we handle your data, cookies, and personal information when you use our hotel price comparison service.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: 'https://svbooking.com' },
        { name: 'Privacy Policy', url: 'https://svbooking.com/privacy' },
      ]} />
      {children}
    </>
  );
}
