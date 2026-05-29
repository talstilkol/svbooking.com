// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import CurrencyConverter from '@/components/CurrencyConverter';

describe('CurrencyConverter', () => {
  it('renders the heading', () => {
    render(<CurrencyConverter />);
    expect(screen.getByText(/Currency Converter/)).toBeInTheDocument();
  });

  it('converts the default 100 USD to 92.00 EUR', () => {
    render(<CurrencyConverter />);
    // 100 / 1 (USD) * 0.92 (EUR) = 92.00
    expect(screen.getByText(/92\.00/)).toBeInTheDocument();
  });

  it('shows the per-unit rate line', () => {
    render(<CurrencyConverter />);
    // 1 USD = 0.9200 EUR
    expect(screen.getByText(/1 USD = 0\.9200 EUR/)).toBeInTheDocument();
  });

  it('recomputes when the amount changes', async () => {
    const user = userEvent.setup();
    render(<CurrencyConverter />);
    const amount = screen.getByRole('spinbutton'); // the only number input
    await user.clear(amount);
    await user.type(amount, '200');
    // 200 * 0.92 = 184.00
    expect(screen.getByText(/184\.00/)).toBeInTheDocument();
  });
});
