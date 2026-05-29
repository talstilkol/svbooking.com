// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

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

describe('CurrencySelector', () => {
  it('renders a labeled currency select', () => {
    render(<CurrencySelector />);
    expect(screen.getByLabelText('Select currency')).toBeInTheDocument();
  });

  it('renders all 8 supported currencies', () => {
    render(<CurrencySelector />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(8);
    expect(CURRENCIES).toHaveLength(8);
  });

  it('defaults to USD', () => {
    render(<CurrencySelector />);
    expect(screen.getByLabelText('Select currency')).toHaveValue('USD');
  });

  it('includes EUR, GBP, and JPY options', () => {
    render(<CurrencySelector />);
    expect(screen.getByRole('option', { name: /USD/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /EUR/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /GBP/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /JPY/ })).toBeInTheDocument();
  });

  it('updates the selected value on change', async () => {
    const user = userEvent.setup();
    render(<CurrencySelector />);
    const select = screen.getByLabelText('Select currency');
    await user.selectOptions(select, 'EUR');
    expect(select).toHaveValue('EUR');
  });

  it('accepts custom className', () => {
    render(<CurrencySelector className="w-32" />);
    expect(screen.getByLabelText('Select currency')).toHaveClass('w-32');
  });
});
