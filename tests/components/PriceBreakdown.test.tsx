// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import PriceBreakdown from '@/components/PriceBreakdown';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

describe('PriceBreakdown', () => {
  it('returns null for zero nights', () => {
    const { container } = render(<PriceBreakdown pricePerNight={100} nights={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null for zero price', () => {
    const { container } = render(<PriceBreakdown pricePerNight={0} nights={3} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the computed total (price × nights)', () => {
    render(<PriceBreakdown pricePerNight={120} nights={3} />);
    expect(screen.getByText('$360 total')).toBeInTheDocument();
  });

  it('uses a custom currency symbol', () => {
    render(<PriceBreakdown pricePerNight={100} nights={2} currency="€" />);
    expect(screen.getByText('€200 total')).toBeInTheDocument();
  });

  it('expands the breakdown details on click', async () => {
    const user = userEvent.setup();
    render(<PriceBreakdown pricePerNight={100} nights={2} provider="Booking.com" />);
    expect(screen.queryByText('Taxes and provider fees')).toBeNull();

    await user.click(screen.getByText('See breakdown'));
    expect(screen.getByText('Taxes and provider fees')).toBeInTheDocument();
    expect(screen.getByText(/Final price will be confirmed on/i)).toBeInTheDocument();
  });

  it('includes provider name in the summary', () => {
    render(<PriceBreakdown pricePerNight={100} nights={2} provider="Expedia" />);
    expect(screen.getByText(/via Expedia/)).toBeInTheDocument();
  });

  it('switches price breakdown labels to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <PriceBreakdown pricePerNight={100} nights={2} provider="Expedia" />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByText('סה"כ $200')).toBeInTheDocument();
    expect(screen.getByText(/\$100\/לילה ממוצע · 2 לילות דרך Expedia/)).toBeInTheDocument();

    await user.click(screen.getByText('הצג פירוט'));
    expect(screen.getByText('מסים ועמלות ספק')).toBeInTheDocument();
    expect(screen.getByText(/המחיר הסופי יאושר באתר של Expedia/)).toBeInTheDocument();
  });
});
