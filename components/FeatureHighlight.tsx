import Link from 'next/link';

interface Feature {
  icon: string;
  title: string;
  description: string;
  href: string;
  color: string;
}

const FEATURES: Feature[] = [
  {
    icon: '📊',
    title: 'Side-by-Side Compare',
    description: 'Compare up to 4 hotels with detailed pricing from every provider',
    href: '/compare-hotels',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: '📅',
    title: 'Cheaper Dates Finder',
    description: 'AI discovers when prices drop — save up to 40% by shifting dates',
    href: '/compare',
    color: 'from-green-500 to-emerald-600',
  },
  {
    icon: '🤖',
    title: 'AI Deal Scanner',
    description: 'Autonomous agents scan prices 24/7 and alert you on drops',
    href: '/agents',
    color: 'from-purple-500 to-indigo-600',
  },
  {
    icon: '🗺️',
    title: 'Destination Explorer',
    description: 'Browse by continent, country, or city — with live pricing',
    href: '/explore',
    color: 'from-amber-500 to-orange-600',
  },
];

export default function FeatureHighlight({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">✨ Power Features</h2>
      <p className="text-sm text-slate-500 mb-5">
        Tools that make us different from every other booking site
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FEATURES.map((f) => (
          <Link
            key={f.title}
            href={f.href}
            className="group relative overflow-hidden rounded-2xl p-6 text-white hover:shadow-xl transition-shadow"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${f.color}`} />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
            <div className="relative">
              <span className="text-3xl block mb-3">{f.icon}</span>
              <h3 className="text-lg font-bold mb-1">{f.title}</h3>
              <p className="text-sm opacity-90">{f.description}</p>
              <span className="inline-block mt-3 text-sm font-medium opacity-80 group-hover:opacity-100 transition">
                Try it →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
