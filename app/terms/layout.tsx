import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'SV Booking terms of service. Read about your rights and obligations when using our hotel price comparison platform.',
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
