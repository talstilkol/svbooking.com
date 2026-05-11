import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  const links = {
    Explore: [
      { href: '/search', label: 'Browse Hotels' },
      { href: '/compare', label: 'Compare Prices' },
      { href: '/explore', label: 'Explore Destinations' },
    ],
    Tools: [
      { href: '/trips', label: 'Trip Planner' },
      { href: '/favorites', label: 'Favorites' },
      { href: '/agents', label: 'AI Agents' },
    ],
    Top: [
      { href: '/search?city=Paris', label: 'Hotels in Paris' },
      { href: '/search?city=London', label: 'Hotels in London' },
      { href: '/search?city=Tokyo', label: 'Hotels in Tokyo' },
      { href: '/search?city=Dubai', label: 'Hotels in Dubai' },
      { href: '/search?city=New York', label: 'Hotels in New York' },
      { href: '/search?city=Bangkok', label: 'Hotels in Bangkok' },
    ],
  };

  return (
    <footer className="bg-slate-900 text-slate-400 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl mb-3">
              <span className="text-2xl">✈️</span>
              SV Booking
            </Link>
            <p className="text-sm leading-relaxed">
              Compare hotel prices from Booking.com, Expedia, Hotels.com, Agoda & more. Find the best deal in seconds.
            </p>
          </div>

          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h3 className="text-white font-semibold text-sm mb-3">{section === 'Top' ? 'Popular destinations' : section}</h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs">
            © {year} SV Booking · Compare prices from 8+ OTA providers · 63 hotels across 20 cities
          </p>
          <p className="text-xs">
            Prices from{' '}
            <a href="https://xotelo.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Xotelo API
            </a>
            {' '}· No sign-up required
          </p>
        </div>
      </div>
    </footer>
  );
}
