// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PriceTrend from '@/components/PriceTrend';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

function mockTrend(trend: Array<{ date: string; price: number; label: string; priceSourceLabel?: string }>) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ trend }),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PriceTrend', () => {
  it('renders provider-backed trend copy and switches to Hebrew', async () => {
    const user = userEvent.setup();
    mockTrend([
      { date: '2026-07-01', price: 120, label: 'Jul 1', priceSourceLabel: 'provider-returned rates' },
      { date: '2026-07-02', price: 180, label: 'Jul 2' },
    ]);

    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <PriceTrend hotelKey="g1-d2" />
      </LocaleProvider>
    );

    await screen.findByText('30-day price trend');
    expect(screen.getByRole('img', { name: 'Price trend chart' })).toBeInTheDocument();
    expect(screen.getByText(/Cheapest observed date/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'HE' }));
    expect(screen.getByText('מגמת מחיר ל-30 יום')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'תרשים מגמת מחיר' })).toBeInTheDocument();
    expect(screen.getByText(/התאריך הזול ביותר שנצפה/)).toBeInTheDocument();
  });

  it('marks the cheapest positive point, not a zero-price placeholder', async () => {
    mockTrend([
      { date: '2026-07-01', price: 0, label: 'Jul 1' },
      { date: '2026-07-02', price: 100, label: 'Jul 2' },
      { date: '2026-07-03', price: 180, label: 'Jul 3' },
    ]);

    const { container } = render(<PriceTrend hotelKey="g1-d2" />);
    await screen.findByText('30-day price trend');

    const bars = container.querySelectorAll('[data-testid="price-trend-bar"]');
    expect(bars[0].className).not.toContain('bg-green-400');
    expect(bars[1].className).toContain('bg-green-400');
  });

  it('renders nothing when no positive provider prices are available', async () => {
    mockTrend([{ date: '2026-07-01', price: 0, label: 'Jul 1' }]);

    const { container } = render(<PriceTrend hotelKey="g1-d2" />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
