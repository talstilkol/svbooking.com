import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'Manage your SV Booking profile, preferences, and notification settings.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/profile' },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
