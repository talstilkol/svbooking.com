// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, it, expect, vi } from 'vitest';

// Deterministic storage mock (avoids Node 22 built-in localStorage conflict)
const mockStore: Record<string, unknown> = {};
vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { currency: 'svbooking:currency' },
  LEGACY_LOCAL_STORAGE_KEYS: { currency: 'currency' },
  readLocalStorageJsonWithFallback: (key: string, _f: unknown, fallback: unknown) =>
    mockStore[key] ?? fallback,
  writeLocalStorageJson: (key: string, value: unknown) => {
    mockStore[key] = value;
  },
}));

import CurrencySelector, { CURRENCIES } from '@/components/CurrencySelector';

beforeEach(() => {
  for (const key of Object.keys(mockStore)) delete mockStore[key];
});

async function renderCurrencySelector(ui = <CurrencySelector />) {
  const rendered = render(ui);
  await act(async () => {
    await Promise.resolve();
  });
  return rendered;
}

describe('CurrencySelector', () => {
  it('renders a labeled currency select', async () => {
    await renderCurrencySelector();
    expect(screen.getByLabelText('Select currency')).toBeInTheDocument();
  });

  it('renders all 8 supported currencies', async () => {
    await renderCurrencySelector();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(8);
    expect(CURRENCIES).toHaveLength(8);
  });

  it('defaults to USD', async () => {
    await renderCurrencySelector();
    expect(screen.getByLabelText('Select currency')).toHaveValue('USD');
  });

  it('includes EUR, GBP, and JPY options', async () => {
    await renderCurrencySelector();
    expect(screen.getByRole('option', { name: /USD/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /EUR/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /GBP/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /JPY/ })).toBeInTheDocument();
  });

  it('updates the selected value on change', async () => {
    const user = userEvent.setup();
    await renderCurrencySelector();
    const select = screen.getByLabelText('Select currency');
    await user.selectOptions(select, 'EUR');
    expect(select).toHaveValue('EUR');
  });

  it('accepts custom className', async () => {
    await renderCurrencySelector(<CurrencySelector className="w-32" />);
    expect(screen.getByLabelText('Select currency')).toHaveClass('w-32');
  });
});
