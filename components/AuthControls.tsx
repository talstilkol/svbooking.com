'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

interface AuthState {
  authenticated: boolean;
  user: { givenName: string | null; email: string | null } | null;
}

/**
 * Navbar auth controls. Fetches a lightweight status from /api/me and shows
 * either a "Sign in" link or an account + "Sign out" pair. Fails safe to the
 * signed-out state if the status check errors (e.g. Kinde not configured).
 */
export default function AuthControls({ className = '' }: { className?: string }) {
  const { t } = useLocale();
  const [state, setState] = useState<AuthState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me', { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : { authenticated: false, user: null }))
      .then((data: AuthState) => {
        if (!cancelled) setState(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('AuthControls: status check failed', err);
          setState({ authenticated: false, user: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Before the status resolves, render nothing to avoid a sign-in/out flash.
  if (state === null) {
    return <div className={`h-8 w-16 ${className}`} aria-hidden="true" />;
  }

  if (!state.authenticated) {
    return (
      <a
        href="/api/auth/login"
        className={`px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors ${className}`}
      >
        {t('signIn')}
      </a>
    );
  }

  const label = state.user?.givenName || state.user?.email || t('account');

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors max-w-[10rem]"
        title={label}
      >
        <span
          className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          {label.charAt(0).toUpperCase()}
        </span>
        <span className="truncate hidden lg:inline">{label}</span>
      </Link>
      <a
        href="/api/auth/logout"
        className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
      >
        {t('signOut')}
      </a>
    </div>
  );
}
