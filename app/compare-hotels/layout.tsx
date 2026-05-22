import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Compare Hotels Side by Side',
  description: 'Select up to 4 hotels and compare provider-returned prices side by side when rates are available.',
  alternates: { canonical: '/compare-hotels' },
};

export default function CompareHotelsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: 'https://svbooking.com' },
        { name: 'Compare Hotels', url: 'https://svbooking.com/compare-hotels' },
      ]} />
      {children}
    </>
  );
}
