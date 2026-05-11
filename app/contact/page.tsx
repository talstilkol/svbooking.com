import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the SV Booking team — questions, feedback, partnerships, or support.',
};

const CONTACT_METHODS = [
  {
    icon: '📧',
    title: 'Email',
    desc: 'For general inquiries and support',
    value: 'hello@svbooking.com',
    href: 'mailto:hello@svbooking.com',
  },
  {
    icon: '🐛',
    title: 'Bug Reports',
    desc: 'Found a bug or pricing issue?',
    value: 'Report on GitHub',
    href: 'https://github.com/talstilkol/svbooking.com/issues',
  },
  {
    icon: '💼',
    title: 'Partnerships',
    desc: 'Interested in working with us?',
    value: 'partners@svbooking.com',
    href: 'mailto:partners@svbooking.com',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Is SV Booking really free?',
    a: 'Yes, completely free. No hidden charges, no premium tier. We compare prices from 8+ booking providers at no cost to you.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'No. SV Booking works without any sign-up. Your favorites and preferences are stored locally in your browser.',
  },
  {
    q: 'How accurate are the prices?',
    a: 'We fetch real-time prices from booking providers. Prices may change between our fetch and your booking, so always verify on the provider\'s site.',
  },
  {
    q: 'Can I book directly through SV Booking?',
    a: 'We redirect you to the booking provider with the best price. Your booking is made directly with them — we\'re just the comparison tool.',
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Contact Us</h1>
          <p className="text-slate-600">We&apos;d love to hear from you</p>
        </div>

        {/* Contact methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {CONTACT_METHODS.map((m) => (
            <a
              key={m.title}
              href={m.href}
              target={m.href.startsWith('mailto:') ? undefined : '_blank'}
              rel={m.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
              className="bg-white rounded-xl border border-slate-200 p-6 text-center hover:border-blue-300 hover:shadow-md transition-all"
            >
              <span className="text-3xl block mb-3">{m.icon}</span>
              <h3 className="font-semibold text-slate-800 mb-1">{m.title}</h3>
              <p className="text-xs text-slate-400 mb-2">{m.desc}</p>
              <span className="text-sm text-blue-600 font-medium">{m.value}</span>
            </a>
          ))}
        </div>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <div
                key={item.q}
                className="bg-white rounded-xl border border-slate-200 p-5"
              >
                <h3 className="font-semibold text-slate-800 mb-1">{item.q}</h3>
                <p className="text-sm text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Ready to find your perfect hotel?
          </h2>
          <p className="text-slate-500 mb-4">
            Compare prices from 8+ providers in seconds.
          </p>
          <Link
            href="/search"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition"
          >
            Start Comparing
          </Link>
        </div>
      </div>
    </div>
  );
}
