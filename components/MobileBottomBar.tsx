'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Home', icon: '🏠', activeIcon: '🏠' },
  { href: '/search', label: 'Search', icon: '🔍', activeIcon: '🔎' },
  { href: '/compare', label: 'Compare', icon: '📊', activeIcon: '📊' },
  { href: '/deals', label: 'Deals', icon: '🏷️', activeIcon: '🏷️' },
  { href: '/favorites', label: 'Saved', icon: '♡', activeIcon: '♥' },
];

export default function MobileBottomBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 md:hidden safe-area-bottom"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-14">
        {TABS.map((tab) => {
          const isActive =
            tab.href === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-600'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-lg leading-none" aria-hidden="true">
                {isActive ? tab.activeIcon : tab.icon}
              </span>
              <span
                className={`text-[10px] mt-0.5 font-medium ${
                  isActive ? 'text-blue-600' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 bg-blue-600 rounded-b" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
