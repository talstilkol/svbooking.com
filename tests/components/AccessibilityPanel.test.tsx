// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStore: Record<string, unknown> = {};

vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: {
    accessibilityPreferences: 'svbooking:accessibility',
    locale: 'svbooking:locale',
  },
  LEGACY_LOCAL_STORAGE_KEYS: {
    accessibilityPreferences: 'accessibility-preferences',
  },
  readLocalStorageJsonWithFallback: (key: string, _fallbackKeys: string[], fallback: unknown) =>
    mockStore[key] ?? fallback,
  readLocalStorageStringWithFallback: (key: string, _fallbackKeys: string[], fallback: unknown) =>
    (mockStore[key] as string | null) ?? fallback,
  writeLocalStorageJson: (key: string, value: unknown) => {
    mockStore[key] = value;
  },
}));

import AccessibilityPanel from '@/components/AccessibilityPanel';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

beforeEach(() => {
  for (const key of Object.keys(mockStore)) delete mockStore[key];
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

describe('AccessibilityPanel', () => {
  it('opens localized English controls and persists text-size changes', async () => {
    const user = userEvent.setup();
    render(<AccessibilityPanel />);

    await user.click(screen.getByRole('button', { name: 'Accessibility settings' }));

    expect(screen.getByRole('dialog', { name: 'Accessibility' })).toBeInTheDocument();
    expect(screen.getByText('Text size: 100%')).toBeInTheDocument();
    expect(screen.getByText('High contrast')).toBeInTheDocument();
    expect(screen.getByText('Reduce motion')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Increase font size' }));

    expect(screen.getByText('Text size: 110%')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockStore['svbooking:accessibility']).toMatchObject({ fontSize: 110 });
    });
  });

  it('switches visible and accessible controls to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <AccessibilityPanel />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Accessibility settings' }));
    expect(screen.getByRole('dialog', { name: 'Accessibility' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByRole('dialog', { name: 'נגישות' })).toBeInTheDocument();
    expect(screen.getByLabelText('סגירת הגדרות נגישות')).toBeInTheDocument();
    expect(screen.getByText('גודל טקסט: 100%')).toBeInTheDocument();
    expect(screen.getByText('ניגודיות גבוהה')).toBeInTheDocument();
    expect(screen.getByText('הפחתת תנועה')).toBeInTheDocument();
  });
});
