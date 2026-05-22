'use client';

import { useEffect } from 'react';
import { getLocaleConfig, resolveLocale } from '@/lib/i18n';
import {
  LOCAL_STORAGE_KEYS,
  readLocalStorageStringWithFallback,
  writeLocalStorageJson,
} from '@/lib/local-storage-keys';

function queryLocale() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('locale') || params.get('lang');
  } catch {
    return null;
  }
}

function savedLocale() {
  return readLocalStorageStringWithFallback(LOCAL_STORAGE_KEYS.locale, [], null);
}

function applyLocale(locale: string | null) {
  const config = getLocaleConfig(locale || 'en');
  document.documentElement.lang = config.code;
  document.documentElement.dir = config.dir;
  document.documentElement.dataset.locale = config.code;
  document.documentElement.dataset.localeDirection = config.dir;
  return config;
}

export default function LocaleRuntime() {
  useEffect(() => {
    const requested = queryLocale();
    const locale = resolveLocale({
      locale: requested || savedLocale() || undefined,
      acceptLanguage: navigator.language,
    });
    const applied = applyLocale(locale.code);

    if (requested) {
      writeLocalStorageJson(LOCAL_STORAGE_KEYS.locale, applied.code);
    }
  }, []);

  return null;
}
