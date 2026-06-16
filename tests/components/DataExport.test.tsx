// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageMock = vi.hoisted(() => ({
  store: {} as Record<string, unknown>,
  readExportData: vi.fn(() => ({} as Record<string, unknown>)),
  writeExportData: vi.fn(),
  removeKeys: vi.fn(),
}));

vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { locale: 'svbooking:locale' },
  LOCAL_STORAGE_EXPORT_KEYS: ['svbooking:favorites', 'svbooking:trips'],
  readLocalStorageExportData: storageMock.readExportData,
  writeLocalStorageExportData: storageMock.writeExportData,
  removeLocalStorageKeys: storageMock.removeKeys,
  readLocalStorageStringWithFallback: (key: string) =>
    (storageMock.store[key] as string | undefined) ?? null,
  writeLocalStorageJson: (key: string, value: unknown) => {
    storageMock.store[key] = value;
  },
}));

import DataExport from '@/components/DataExport';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { LocaleProvider } from '@/components/LocaleProvider';

beforeEach(() => {
  for (const key of Object.keys(storageMock.store)) delete storageMock.store[key];
  storageMock.readExportData.mockReturnValue({});
  storageMock.writeExportData.mockClear();
  storageMock.removeKeys.mockClear();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 401 })));
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:svbooking-export'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

describe('DataExport', () => {
  it('exports local data and reports account-data availability without changing the public contract', async () => {
    const user = userEvent.setup();
    render(<DataExport />);

    await user.click(screen.getByRole('button', { name: 'Export data' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Export includes local device data and available account data.'
      );
    });
    expect(fetch).toHaveBeenCalledWith('/api/me/data', { cache: 'no-store' });
    expect(storageMock.readExportData).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('localizes visible controls and explanatory copy to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <DataExport />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByText('הנתונים שלכם')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ייצוא נתונים' })).toBeInTheDocument();
    expect(screen.getByText('ייבוא גיבוי מקומי')).toBeInTheDocument();
    expect(screen.getByText('ניקוי כל הנתונים')).toBeInTheDocument();
    expect(
      screen.getByText(/הייצוא כולל רשומות מהמכשיר המקומי/)
    ).toBeInTheDocument();
  });

  it('uses the localized clear-data confirmation before deleting local records', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.fn(() => false);
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      value: confirmSpy,
    });

    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <DataExport />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));
    await user.click(screen.getByRole('button', { name: 'ניקוי כל הנתונים' }));

    expect(confirmSpy).toHaveBeenCalledWith(
      'פעולה זו תמחק את כל הנתונים השמורים שלכם (מועדפים, טיולים, חיפושים ועוד). להמשיך?'
    );
    expect(storageMock.removeKeys).not.toHaveBeenCalled();
  });
});
