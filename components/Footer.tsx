'use client';

import Link from 'next/link';
import { CATALOG_STATS } from '@/lib/catalog-stats';
import { useLocale } from '@/components/LocaleProvider';

const CITY_LINKS = [
  { href: '/city/Paris', city: 'Paris' },
  { href: '/city/London', city: 'London' },
  { href: '/city/Tokyo', city: 'Tokyo' },
  { href: '/city/Dubai', city: 'Dubai' },
  { href: `/city/${encodeURIComponent('New York')}`, city: 'New York' },
  { href: '/city/Bangkok', city: 'Bangkok' },
  { href: '/city/Barcelona', city: 'Barcelona' },
  { href: '/city/Rome', city: 'Rome' },
  { href: `/city/${encodeURIComponent('San Francisco')}`, city: 'San Francisco' },
  { href: '/city/Singapore', city: 'Singapore' },
];

export default function Footer() {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  const sections = [
    {
      heading: t('footerExplore'),
      ariaLabel: t('footerExplore'),
      items: [
        { href: '/search', label: t('footerBrowseHotels') },
        { href: '/compare', label: t('footerComparePrices') },
        { href: '/compare-hotels', label: t('footerSideBySide') },
        { href: '/deals', label: t('footerTodaysDeals') },
        { href: '/explore', label: t('footerExploreDestinations') },
      ],
    },
    {
      heading: t('footerTools'),
      ariaLabel: t('footerTools'),
      items: [
        { href: '/trips', label: t('footerTripPlanner') },
        { href: '/favorites', label: t('footerFavorites') },
      ],
    },
    {
      heading: t('footerCompany'),
      ariaLabel: t('footerCompany'),
      items: [
        { href: '/about', label: t('footerAboutUs') },
        { href: '/contact', label: t('footerContact') },
        { href: '/privacy', label: t('footerPrivacy') },
        { href: '/terms', label: t('footerTerms') },
      ],
    },
    {
      heading: t('footerPopularDestinations'),
      ariaLabel: t('footerPopularDestinations'),
      items: CITY_LINKS.map((c) => ({ href: c.href, label: `${t('footerHotelsIn')} ${c.city}` })),
    },
  ];

  return (
    <footer className="bg-slate-900 text-slate-400 mt-16" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl mb-3">
              <span className="text-2xl" aria-hidden="true">&#9992;&#65039;</span>
              SV Booking
            </Link>
            <p className="text-sm leading-relaxed">{t('footerTagline')}</p>
            <div className="flex gap-3 mt-4">
              <span className="text-xs bg-slate-800 px-2 py-1 rounded">&#128274; {t('footerSecure')}</span>
              <span className="text-xs bg-slate-800 px-2 py-1 rounded">{t('footerFreeToUse')}</span>
              <span className="text-xs bg-slate-800 px-2 py-1 rounded">{t('footerNoSignup')}</span>
            </div>
          </div>

          {sections.map((section) => (
            <nav key={section.heading} aria-label={section.ariaLabel}>
              <h3 className="text-white font-semibold text-sm mb-3">{section.heading}</h3>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm hover:text-white transition-colors">
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
            {`© ${year} SV Booking · ${t('footerPricesWhenAvailable')} · ${CATALOG_STATS.hotels} ${t('footerHotelsAcross')} ${CATALOG_STATS.cities} ${t('footerCities')}`}
          </p>
          <p className="text-xs">
            {t('footerPricingMeta')}{' '}
            <a href="https://xotelo.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Xotelo API
            </a>
            {' '}&middot; {t('footerNoSignupRequired')}
          </p>
        </div>
      </div>
    </footer>
  );
}
