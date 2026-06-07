// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import ProviderDataNotice from '@/components/ProviderDataNotice';
import FlightDataNotice from '@/components/FlightDataNotice';
import PriceComparisonNotice from '@/components/PriceComparisonNotice';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

describe('ProviderDataNotice', () => {
  it('renders the provider name and Unscored badge', () => {
    render(<ProviderDataNotice provider="Booking.com" />);
    expect(screen.getByText('Booking.com')).toBeInTheDocument();
    expect(screen.getByText('Unscored')).toBeInTheDocument();
    expect(screen.getByText(/Verified provider-quality data is unavailable/i)).toBeInTheDocument();
  });

  it('switches provider-quality notice copy to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <ProviderDataNotice provider="Booking.com" />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));
    expect(screen.getByText('ללא ציון')).toBeInTheDocument();
    expect(screen.getByText(/נתוני איכות ספק מאומתים אינם זמינים/)).toBeInTheDocument();
  });
});

describe('FlightDataNotice', () => {
  it('renders the city in the heading and the unavailable notice', () => {
    render(<FlightDataNotice city="Paris" />);
    expect(screen.getByText(/Flight price data for Paris/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified flight price data is unavailable/i)).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<FlightDataNotice city="X" className="mt-3" />);
    expect(container.firstChild).toHaveClass('mt-3');
  });

  it('switches the flight unavailable notice to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <FlightDataNotice city="Paris" />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));
    expect(screen.getByText('נתוני מחירי טיסות עבור Paris')).toBeInTheDocument();
    expect(screen.getByText(/נתוני מחירי טיסות מאומתים אינם זמינים/)).toBeInTheDocument();
  });
});

describe('PriceComparisonNotice', () => {
  it('renders the heading and the 4 trust chips', () => {
    render(<PriceComparisonNotice />);
    expect(screen.getByText('Price Comparison Notice')).toBeInTheDocument();
    expect(screen.getByText(/Provider-supplied rates/i)).toBeInTheDocument();
    expect(screen.getByText(/Date-specific results/i)).toBeInTheDocument();
    expect(screen.getByText(/Direct provider checkout/i)).toBeInTheDocument();
    expect(screen.getByText(/Terms confirmed off-site/i)).toBeInTheDocument();
  });

  it('switches the price comparison notice to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <PriceComparisonNotice />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));
    expect(screen.getByText('הודעת השוואת מחירים')).toBeInTheDocument();
    expect(screen.getByText('מחירים שסופקו על ידי ספקים')).toBeInTheDocument();
    expect(screen.getByText('תנאים מאושרים מחוץ לאתר')).toBeInTheDocument();
  });
});
