// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HotelPolicies from '@/components/HotelPolicies';
import ReviewHighlights from '@/components/ReviewHighlights';

describe('HotelPolicies', () => {
  it('renders the heading and unavailable-policy disclosure', () => {
    render(<HotelPolicies />);
    expect(screen.getByRole('heading', { name: /Hotel Policies/i })).toBeInTheDocument();
    expect(screen.getByText(/Verified property policy data is unavailable/i)).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<HotelPolicies className="mt-5" />);
    expect(container.firstChild).toHaveClass('mt-5');
  });
});

describe('ReviewHighlights', () => {
  it('renders the hotel name and unavailable status', () => {
    render(<ReviewHighlights hotelKey="g1-d2" hotelName="Le Meurice" />);
    expect(screen.getByText(/Verified guest review data for Le Meurice is unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: unavailable/i)).toBeInTheDocument();
  });
});
