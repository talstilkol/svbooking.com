// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ComparisonMeta from '@/components/ComparisonMeta';

describe('ComparisonMeta', () => {
  it('shows pluralized provider count and nights', () => {
    render(<ComparisonMeta providerCount={3} checkIn="2027-03-01" checkOut="2027-03-04" currency="USD" />);
    expect(screen.getByText(/3 provider-returned rates/)).toBeInTheDocument();
    expect(screen.getByText(/3 nights/)).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  it('uses singular forms for a single provider and night', () => {
    render(<ComparisonMeta providerCount={1} checkIn="2027-03-01" checkOut="2027-03-02" currency="EUR" />);
    expect(screen.getByText(/1 provider-returned rate$/)).toBeInTheDocument();
    expect(screen.getByText(/1 night$/)).toBeInTheDocument();
  });

  it('renders the date range', () => {
    render(<ComparisonMeta providerCount={2} checkIn="2027-03-01" checkOut="2027-03-03" currency="USD" />);
    expect(screen.getByText(/Mar 1.*→.*Mar 3/)).toBeInTheDocument();
  });
});
