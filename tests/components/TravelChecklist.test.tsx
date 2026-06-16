// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStore = vi.hoisted(() => ({} as Record<string, unknown>));

vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { locale: 'svbooking:locale' },
  getTravelChecklistStorageKey: (hotelKey?: string) =>
    `svbooking:travel-checklist:${encodeURIComponent(hotelKey || 'default')}`,
  getLegacyTravelChecklistStorageKey: (hotelKey?: string) =>
    `travel-checklist-${hotelKey || 'default'}`,
  readLocalStorageJsonWithFallback: (
    key: string,
    fallbackKeys: readonly string[],
    fallback: unknown
  ) => {
    if (mockStore[key] !== undefined) return mockStore[key];
    for (const fallbackKey of fallbackKeys) {
      if (mockStore[fallbackKey] !== undefined) return mockStore[fallbackKey];
    }
    return fallback;
  },
  readLocalStorageStringWithFallback: (key: string) =>
    (mockStore[key] as string | undefined) ?? null,
  writeLocalStorageJson: (key: string, value: unknown) => {
    mockStore[key] = value;
  },
}));

import TravelChecklist from '@/components/TravelChecklist';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { LocaleProvider } from '@/components/LocaleProvider';
import { getTravelChecklistStorageKey } from '@/lib/local-storage-keys';

beforeEach(() => {
  for (const key of Object.keys(mockStore)) delete mockStore[key];
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

describe('TravelChecklist', () => {
  it('renders and persists the checklist checked state without relying on stored labels', async () => {
    const user = userEvent.setup();
    render(<TravelChecklist hotelKey="g1-d2" />);

    await waitFor(() => {
      expect(screen.getByText('0/8 items completed')).toBeInTheDocument();
    });

    await user.click(screen.getByText(/Open/));
    await user.click(screen.getByLabelText('Check passport validity'));

    const stored = mockStore[getTravelChecklistStorageKey('g1-d2')] as Array<{
      id: string;
      checked: boolean;
      label?: string;
    }>;
    expect(stored[0]).toMatchObject({ id: 'passport', checked: true });
    expect(stored[0].label).toBeUndefined();
  });

  it('switches checklist heading, counts, and item labels to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <TravelChecklist hotelKey="g1-d2" />
      </LocaleProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('0/8 items completed')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByText('0/8 פריטים הושלמו')).toBeInTheDocument();
    await user.click(screen.getByText(/פתיחה/));

    expect(
      screen.getByRole('heading', { name: /רשימת הכנות לנסיעה/ })
    ).toBeInTheDocument();
    expect(screen.getByText('בדיקת תוקף דרכון')).toBeInTheDocument();
    expect(screen.getByText('השוואת מחירי מלונות')).toBeInTheDocument();
  });

  it('uses localized labels even when legacy storage contains English labels', async () => {
    const user = userEvent.setup();
    mockStore[getTravelChecklistStorageKey('g1-d2')] = [
      { id: 'passport', label: 'Old English passport label', checked: true },
    ];

    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <TravelChecklist hotelKey="g1-d2" />
      </LocaleProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('1/8 items completed')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'HE' }));
    await user.click(screen.getByText(/פתיחה/));

    expect(screen.getByText('בדיקת תוקף דרכון')).toBeInTheDocument();
    expect(screen.queryByText('Old English passport label')).toBeNull();
  });
});
