// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import PriceInCurrencies from '@/components/PriceInCurrencies';

function mockRates(rates: Record<string, number> | null) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(rates ? { rates } : {}),
  });
}

afterEach(() => vi.restoreAllMocks());

describe('PriceInCurrencies', () => {
  it('renders nothing before rates load', () => {
    vi.stubGlobal('fetch', mockRates(null));
    const { container } = render(<PriceInCurrencies amount={100} baseCurrency="USD" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows converted prices once rates arrive', async () => {
    vi.stubGlobal('fetch', mockRates({ EUR: 0.9, GBP: 0.8, JPY: 150 }));
    render(<PriceInCurrencies amount={100} baseCurrency="USD" />);
    await waitFor(() => {
      expect(screen.getByText('Price in other currencies')).toBeInTheDocument();
    });
    // 100 * 0.9 = 90 EUR
    expect(screen.getByText('€90')).toBeInTheDocument();
    expect(screen.getByText('£80')).toBeInTheDocument();
    expect(screen.getByText('¥15,000')).toBeInTheDocument();
  });

  it('excludes the base currency from conversions', async () => {
    vi.stubGlobal('fetch', mockRates({ EUR: 0.9, USD: 1 }));
    render(<PriceInCurrencies amount={100} baseCurrency="USD" />);
    await waitFor(() => {
      expect(screen.getByText('Price in other currencies')).toBeInTheDocument();
    });
    // USD chip should not appear (it's the base)
    expect(screen.queryByText('USD')).toBeNull();
  });

  it('renders nothing when no non-base rates are available', async () => {
    vi.stubGlobal('fetch', mockRates({ USD: 1 }));
    const { container } = render(<PriceInCurrencies amount={100} baseCurrency="USD" />);
    await waitFor(() => {
      // Effect resolved; with only base currency, component returns null
      expect(container.firstChild).toBeNull();
    });
  });
});
