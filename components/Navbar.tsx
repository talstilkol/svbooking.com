'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import CurrencySelector from '@/components/CurrencySelector';
import NotificationBell from '@/components/NotificationBell';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import AuthControls from '@/components/AuthControls';
import { useLocale } from '@/components/LocaleProvider';

const NAV_LINKS = [
  { href: '/search', key: 'navSearch' },
  { href: '/compare', key: 'navCompare' },
  { href: '/deals', key: 'navDeals' },
  { href: '/explore', key: 'navExplore' },
  { href: '/trips', key: 'navTrips' },
  { href: '/favorites', key: 'navFavorites' },
  { href: '/dashboard', key: 'navDashboard' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && mobileOpen) setMobileOpen(false);
  }, [mobileOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close mobile menu on route change
  useEffect(() => {
    queueMicrotask(() => setMobileOpen(false));
  }, [pathname]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm" role="navigation" aria-label={t('mainNavigation')}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg" aria-label={t('navHome')}>
          <span className="text-2xl" aria-hidden="true">&#9992;</span>
          SV Booking
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === '/'
                ? pathname === '/'
                : pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                title={link.href === '/search' ? t('searchHotels') : undefined}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                }`}
              >
                {t(link.key)}
              </Link>
            );
          })}
        </div>

        {/* Locale + currency + notifications + auth (desktop) */}
        <div className="hidden md:flex items-center gap-2">
          <LocaleSwitcher />
          <NotificationBell />
          <CurrencySelector />
          <AuthControls />
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-slate-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
          aria-label={mobileOpen ? t('closeMenu') : t('openMenu')}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div id="mobile-nav" className="md:hidden bg-white border-t border-slate-200 shadow-lg" aria-label="Mobile navigation">
          <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
            <CurrencySelector className="flex-1" />
            <LocaleSwitcher />
          </div>
          <div className="px-6 py-3 border-b border-slate-100">
            <AuthControls />
          </div>
          {NAV_LINKS.map((link) => {
            const active =
              link.href === '/'
                ? pathname === '/'
                : pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMobileOpen(false)}
                className={`block px-6 py-3 text-sm font-medium border-b border-slate-100 ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-blue-50'
                }`}
              >
                {t(link.key)}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
