import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with SV Booking. We\'d love to hear your feedback, partnership inquiries, or support questions.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
