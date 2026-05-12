import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'SV Booking privacy policy. Learn how we handle your data, cookies, and personal information when you use our hotel price comparison service.',
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
