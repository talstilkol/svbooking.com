import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About SV Booking',
  description:
    'Learn about SV Booking — the free hotel price comparison platform that helps travelers find the best deals across 8+ booking providers in 20+ cities worldwide.',
};

const STATS = [
  { number: '63+', label: 'Hotels' },
  { number: '20', label: 'Cities' },
  { number: '8+', label: 'Providers' },
  { number: '15+', label: 'Countries' },
];

const TEAM_VALUES = [
  {
    icon: '🎯',
    title: 'Transparency',
    desc: 'We show real prices from real providers. No hidden fees, no affiliate tricks.',
  },
  {
    icon: '⚡',
    title: 'Speed',
    desc: 'Real-time price comparisons in seconds, not minutes. Your time matters.',
  },
  {
    icon: '🔒',
    title: 'Privacy',
    desc: 'No account required. No tracking. Your favorites stay on your device.',
  },
  {
    icon: '💡',
    title: 'Innovation',
    desc: 'AI-powered recommendations, cheaper date discovery, and trend analysis.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About SV Booking</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            We believe finding the best hotel price should be free, fast, and transparent.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 text-center"
            >
              <p className="text-2xl md:text-3xl font-bold text-blue-600">{s.number}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Mission */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 leading-relaxed">
              SV Booking was built with a simple goal: help travelers compare hotel prices
              across all major booking platforms in one place. Instead of opening 8 different
              tabs and manually checking prices, we do it for you in real-time.
            </p>
            <p className="text-slate-600 leading-relaxed mt-4">
              We aggregate live pricing data from Booking.com, Expedia, Hotels.com, Agoda,
              Trip.com, Vio.com, and more. When you find the best price, you book directly
              with the provider — we never charge a middleman fee.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">What We Stand For</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TEAM_VALUES.map((v) => (
              <div
                key={v.title}
                className="bg-white rounded-xl border border-slate-200 p-6"
              >
                <span className="text-3xl mb-3 block">{v.icon}</span>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">{v.title}</h3>
                <p className="text-sm text-slate-600">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">How It Works</h2>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Search', desc: 'Enter a hotel name, city, or browse our curated catalog of 63+ premium hotels.' },
              { step: '2', title: 'Compare', desc: 'We fetch real-time prices from 8+ major booking providers simultaneously.' },
              { step: '3', title: 'Save', desc: 'Find a cheaper date? Set a price alert? Save to your trip planner — all free.' },
              { step: '4', title: 'Book', desc: 'Click through to the provider with the best price and book directly. No middleman.' },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{s.title}</h3>
                  <p className="text-sm text-slate-600">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Ready to find the best deal?</h2>
          <p className="text-slate-600 mb-4">Start comparing hotel prices — completely free.</p>
          <div className="flex justify-center gap-3">
            <Link
              href="/search"
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition"
            >
              Search Hotels
            </Link>
            <Link
              href="/explore"
              className="px-6 py-3 bg-white text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 font-medium transition"
            >
              Explore Destinations
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
