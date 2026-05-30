'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  getLocaleConfig,
  resolveLocale,
  getDictionary,
} from '@/lib/i18n';
import {
  LOCAL_STORAGE_KEYS,
  readLocalStorageStringWithFallback,
  writeLocalStorageJson,
} from '@/lib/local-storage-keys';

type Dir = 'ltr' | 'rtl';

interface LocaleContextValue {
  locale: string;
  dir: Dir;
  /** Translate a dictionary key; falls back to the key itself if missing. */
  t: (key: string) => string;
  setLocale: (code: string) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyDom(code: string, dir: Dir) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = code;
  document.documentElement.dir = dir;
  document.documentElement.dataset.locale = code;
  document.documentElement.dataset.localeDirection = dir;
}

function readQueryLocale(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('locale') || params.get('lang');
  } catch {
    return null;
  }
}

/**
 * Client context that holds the active locale, its dictionary, and a setter.
 * Server-component children passed via {children} stay server-rendered — only
 * components that call useLocale() opt into client rendering.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<string>('en');
  const [dict, setDict] = useState<Record<string, string>>(() => getDictionary('en'));

  // Resolve the locale once on mount from ?locale=, saved preference, or Accept-Language.
  useEffect(() => {
    let cancelled = false;
    let saved: string | null = null;
    try {
      saved = readLocalStorageStringWithFallback(LOCAL_STORAGE_KEYS.locale, [], null);
    } catch (err) {
      console.warn('LocaleProvider: failed to read saved locale', err);
    }
    const requested = readQueryLocale();
    const config = resolveLocale({
      locale: requested || saved || undefined,
      acceptLanguage: typeof navigator !== 'undefined' ? navigator.language : undefined,
    });

    queueMicrotask(() => {
      if (cancelled) return;
      setLocaleState(config.code);
      setDict(getDictionary(config.code));
      applyDom(config.code, config.dir as Dir);
      if (requested) {
        try {
          writeLocalStorageJson(LOCAL_STORAGE_KEYS.locale, config.code);
        } catch (err) {
          console.warn('LocaleProvider: failed to persist locale', err);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((code: string) => {
    const config = getLocaleConfig(code);
    setLocaleState(config.code);
    setDict(getDictionary(config.code));
    applyDom(config.code, config.dir as Dir);
    try {
      writeLocalStorageJson(LOCAL_STORAGE_KEYS.locale, config.code);
    } catch (err) {
      console.warn('LocaleProvider: failed to persist locale', err);
    }
  }, []);

  const t = useCallback((key: string) => dict[key] ?? key, [dict]);
  const dir = (getLocaleConfig(locale).dir as Dir) || 'ltr';

  return (
    <LocaleContext.Provider value={{ locale, dir, t, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

/**
 * Access the active locale. Falls back to a safe English default when used
 * outside a provider (e.g. isolated tests), so it never throws.
 */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  const fallback = getDictionary('en');
  return {
    locale: 'en',
    dir: 'ltr',
    t: (key: string) => fallback[key] ?? key,
    setLocale: () => {},
  };
}
