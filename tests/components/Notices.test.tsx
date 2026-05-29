// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProviderDataNotice from '@/components/ProviderDataNotice';
import FlightDataNotice from '@/components/FlightDataNotice';
import PriceComparisonNotice from '@/components/PriceComparisonNotice';

describe('ProviderDataNotice', () => {
  it('renders the provider name and Unscored badge', () => {
    render(<ProviderDataNotice provider="Booking.com" />);
    expect(screen.getByText('Booking.com')).toBeInTheDocument();
    expect(screen.getByText('Unscored')).toBeInTheDocument();
    expect(screen.getByText(/Verified provider-quality data is unavailable/i)).toBeInTheDocument();
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
});
