import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  const links = {
    Explore: [
      { href: '/search', label: 'Browse Hotels' },
      { href: '/compare', label: 'Compare Prices' },
      { href: '/compare-hotels', label: 'Side-by-Side Compare' },
      { href: '/explore', label: 'Explore Destinations' },
    ],
    Tools: [
      { href: '/trips', label: 'Trip Planner' },
      { href: '/favorites', label: 'Favorites' },
      { href: '/agents', label: 'AI Agents' },
    ],
    Top: [
      { href: '/city/Paris', label: 'Hotels in Paris' },
      { href: '/city/London', label: 'Hotels in London' },
      { href: '/city/Tokyo', label: 'Hotels in Tokyo' },
      { href: '/city/Dubai', label: 'Hotels in Dubai' },
      { href: `/city/${encodeURIComponent('New York')}`, label: 'Hotels in New York' },
      { href: '/city/Bangkok', label: 'Hotels in Bangkok' },
    ],
  };

  return (
    <footer className="bg-slate-900 text-slate-400 mt-16" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl mb-3">
              <span className="text-2xl" aria-hidden="true">&#9992;&#65039;</span>
              SV Booking
            </Link>
            <p className="text-sm leading-relaxed">
              Compare hotel prices from Booking.com, Expedia, Hotels.com, Agoda & more. Find the best deal in seconds.
            </p>
            <div className="flex gap-3 mt-4">
              <span className="text-xs bg-slate-800 px-2 py-1 rounded">&#128274; Secure</span>
              <span className="text-xs bg-slate-800 px-2 py-1 rounded">Free to use</span>
              <span className="text-xs bg-slate-800 px-2 py-1 rounded">No sign-up</span>
            </div>
          </div>

          {Object.entries(links).map(([section, items]) => (
            <nav key={section} aria-label={section === 'Top' ? 'Popular destinations' : section}>
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
            </nav>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs">
            &copy; {year} SV Booking &middot; Compare prices from 8+ OTA providers &middot; 63 hotels across 20 cities
          </p>
          <p className="text-xs">
            Prices from{' '}
            <a href="https://xotelo.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Xotelo API
            </a>
            {' '}&middot; No sign-up required
          </p>
        </div>
      </div>
    </footer>
  );
}
