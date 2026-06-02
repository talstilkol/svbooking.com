// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const store: Record<string, unknown> = {};
vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { locale: 'svbooking:locale' },
  readLocalStorageStringWithFallback: (key: string) => (store[key] as string) ?? null,
  readLocalStorageJsonWithFallback: (key: string, _f: unknown, fallback: unknown) => store[key] ?? fallback,
  writeLocalStorageJson: (key: string, value: unknown) => { store[key] = value; },
}));

import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import LegalDocument, { type LegalContent } from '@/components/LegalDocument';

const en: LegalContent = {
  title: 'Test Policy',
  lastUpdated: 'Last updated: Jan 1, 2026',
  sections: [
    {
      heading: '1. Intro',
      body: '**Important.** Call `/api/me/data` to export.',
    },
    {
      heading: '2. List',
      body: 'You agree not to:',
      list: ['Item one', 'Item two'],
      bodyAfter: 'Trailing note.',
    },
  ],
};

const he: LegalContent = {
  title: 'מדיניות בדיקה',
  lastUpdated: 'עודכן לאחרונה: 1 בינואר 2026',
  disclaimer: 'תרגום לנוחותכם; הנוסח באנגלית מחייב.',
  sections: [
    {
      heading: '1. מבוא',
      body: '**חשוב.** קראו ל-`/api/me/data` לייצוא.',
    },
    {
      heading: '2. רשימה',
      body: 'אתם מסכימים שלא:',
      list: ['פריט אחד', 'פריט שניים'],
      bodyAfter: 'הערת סיום.',
    },
  ],
};

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

describe('LegalDocument', () => {
  it('renders the English document by default with no disclaimer', () => {
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <LegalDocument en={en} he={he} />
      </LocaleProvider>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Test Policy' })).toBeInTheDocument();
    expect(screen.getByText('1. Intro')).toBeInTheDocument();
    expect(screen.queryByText(/הנוסח באנגלית מחייב/)).not.toBeInTheDocument();
  });

  it('parses **bold** into <strong> and `code` into <code>', () => {
    render(
      <LocaleProvider>
        <LegalDocument en={en} he={he} />
      </LocaleProvider>
    );
    const strong = screen.getByText('Important.');
    expect(strong.tagName).toBe('STRONG');
    const code = screen.getByText('/api/me/data');
    expect(code.tagName).toBe('CODE');
  });

  it('renders list items and the trailing paragraph', () => {
    render(
      <LocaleProvider>
        <LegalDocument en={en} he={he} />
      </LocaleProvider>
    );
    expect(screen.getByText('Item one')).toBeInTheDocument();
    expect(screen.getByText('Item two')).toBeInTheDocument();
    expect(screen.getByText('Trailing note.')).toBeInTheDocument();
  });

  it('switches to the Hebrew document and shows the convenience-translation disclaimer', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <LegalDocument en={en} he={he} />
      </LocaleProvider>
    );
    await user.click(screen.getByRole('button', { name: 'HE' }));
    expect(screen.getByRole('heading', { level: 1, name: 'מדיניות בדיקה' })).toBeInTheDocument();
    expect(screen.getByText('תרגום לנוחותכם; הנוסח באנגלית מחייב.')).toBeInTheDocument();
    expect(screen.getByText('פריט אחד')).toBeInTheDocument();
  });
});
