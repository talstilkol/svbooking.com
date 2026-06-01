import type { Metadata } from 'next';
import LegalDocument from '@/components/LegalDocument';
import { termsEn, termsHe } from '@/lib/legal-content';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'SV Booking terms of service — usage terms, disclaimers, and conditions for using our hotel price comparison service.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return <LegalDocument en={termsEn} he={termsHe} />;
}
