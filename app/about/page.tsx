import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbJsonLd } from '@/components/JsonLd';
import { CATALOG_STATS } from '@/lib/catalog-stats';

export const metadata: Metadata = {
  title: 'About SV Booking',
  description:
    'Learn about SV Booking — the free hotel price comparison platform that helps travelers compare verified prices across a curated global catalog.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About SV Booking',
    description: 'Free hotel price comparison across a curated global catalog of verified properties.',
    type: 'website',
  },
};

const STATS = [
  { number: String(CATALOG_STATS.hotels), label: 'Hotels' },
  { number: String(CATALOG_STATS.cities), label: 'Cities' },
  { number: '8+', label: 'Providers' },
  { number: String(CATALOG_STATS.countries), label: 'Countries' },
];

const TEAM_VALUES = [
  {
    icon: '🎯',
    title: 'Transparency',
    desc: 'We show provider-returned prices and label unavailable data instead of filling gaps.',
  },
  {
    icon: '⚡',
    title: 'Speed',
    desc: 'Provider-returned price comparisons in seconds when configured providers respond.',
  },
  {
    icon: '🔒',
    title: 'Privacy',
    desc: 'Public search works without an account; local favorites stay on your device.',
  },
  {
    icon: '💡',
    title: 'Innovation',
    desc: 'Agent-assisted recommendations, cheaper date discovery, and verified trend states.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://svbooking.com' },
          { name: 'About', url: 'https://svbooking.com/about' },
        ]}
      />
      {/* Hero */}
      <div className="bg-linear-to-br from-blue-600 to-indigo-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About SV Booking</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            We believe comparing available hotel prices should be free, fast, and transparent.
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
              across configured booking providers in one place. Instead of opening multiple
              tabs and manually checking prices, we compare available provider data in one place.
            </p>
            <p className="text-slate-600 leading-relaxed mt-4">
              We request pricing data from configured providers and display only offers returned
              by those sources. When you find an available provider price, checkout happens
              directly with the provider — SV Booking does not add a booking fee.
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
              { step: '1', title: 'Search', desc: `Enter a hotel name, city, or browse the curated catalog of ${CATALOG_STATS.hotels} hotels.` },
              { step: '2', title: 'Compare', desc: 'We fetch provider-returned prices from available booking providers simultaneously.' },
              { step: '3', title: 'Save', desc: 'Find a cheaper date? Set a price alert? Save to your trip planner — all free.' },
              { step: '4', title: 'Book', desc: 'Click through to the selected provider and book directly. No SV Booking fee.' },
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
          <h2 className="text-xl font-bold text-slate-900 mb-2">Ready to compare available rates?</h2>
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
