import type { Metadata } from 'next';
import LegalDocument from '@/components/LegalDocument';
import { privacyEn, privacyHe } from '@/lib/legal-content';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'SV Booking privacy policy — how we handle your data, what we collect, and your rights.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return <LegalDocument en={privacyEn} he={privacyHe} />;
}
