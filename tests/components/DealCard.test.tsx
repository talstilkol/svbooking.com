// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DealCard from '@/components/DealCard';

const DEAL = {
  hotel: { hotelKey: 'g1-d2', name: 'Le Meurice', city: 'Paris', country: 'France', image: '/img.jpg' },
  bestPrice: 700,
  pricePerNight: 350,
  bestProvider: 'Booking.com',
  checkIn: '2027-03-01',
  checkOut: '2027-03-03',
  nights: 2,
  currency: 'USD',
};

describe('DealCard', () => {
  it('renders hotel name, location, and per-night price', () => {
    render(<DealCard deal={DEAL} />);
    expect(screen.getByText('Le Meurice')).toBeInTheDocument();
    expect(screen.getByText(/Paris, France/)).toBeInTheDocument();
    expect(screen.getByText('USD 350/night')).toBeInTheDocument();
  });

  it('shows total price and provider source label', () => {
    render(<DealCard deal={DEAL} />);
    expect(screen.getByText('USD 700')).toBeInTheDocument();
    expect(screen.getByText(/2 nights · via Booking.com/)).toBeInTheDocument();
  });

  it('falls back to "Provider unavailable" when no provider', () => {
    render(<DealCard deal={{ ...DEAL, bestProvider: null }} />);
    expect(screen.getByText(/Provider unavailable/)).toBeInTheDocument();
  });

  it('links to the hotel detail page', () => {
    render(<DealCard deal={DEAL} />);
    const links = screen.getAllByRole('link');
    expect(links.every((l) => l.getAttribute('href') === '/hotel/g1-d2')).toBe(true);
  });
});
