// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TripCostCalculator from '@/components/TripCostCalculator';

describe('TripCostCalculator', () => {
  it('renders the heading and hotel subtotal', () => {
    render(<TripCostCalculator hotelPricePerNight={100} nights={3} currency="USD" />);
    expect(screen.getByText(/Trip Cost Calculator/)).toBeInTheDocument();
    // hotelTotal = 100 * 3 = 300; with no extras it appears on both the hotel
    // line and the grand Total row.
    expect(screen.getAllByText('USD 300').length).toBeGreaterThanOrEqual(1);
  });

  it('computes the hotel subtotal for a different currency/length', () => {
    render(<TripCostCalculator hotelPricePerNight={200} nights={2} currency="EUR" />);
    // hotelTotal = 200 * 2 = 400
    expect(screen.getAllByText('EUR 400').length).toBeGreaterThanOrEqual(1);
  });

  it('hides breakfast/transport lines until enabled', () => {
    render(<TripCostCalculator hotelPricePerNight={150} nights={2} currency="USD" />);
    expect(screen.queryByText(/Airport transfer/)).toBeNull();
    expect(screen.queryByText(/Breakfast \(/)).toBeNull();
  });

  it('shows the hotel night count in the breakdown', () => {
    render(<TripCostCalculator hotelPricePerNight={100} nights={1} currency="USD" />);
    expect(screen.getByText(/Hotel \(1 night\)/)).toBeInTheDocument();
  });
});
