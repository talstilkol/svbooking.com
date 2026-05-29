// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HotelQuickFacts from '@/components/HotelQuickFacts';

describe('HotelQuickFacts', () => {
  it('renders the hotel name in the heading', () => {
    render(<HotelQuickFacts hotelKey="g1-d2" hotelName="Le Meurice" city="Paris" />);
    expect(screen.getByText(/Quick Facts — Le Meurice/)).toBeInTheDocument();
  });

  it('shows the city and catalog key as known facts', () => {
    render(<HotelQuickFacts hotelKey="g1-d2" hotelName="Le Meurice" city="Paris" />);
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('g1-d2')).toBeInTheDocument();
  });

  it('marks unsourced facts as Unavailable (no fabrication)', () => {
    render(<HotelQuickFacts hotelKey="g1-d2" hotelName="X" city="Rome" />);
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThanOrEqual(4);
  });

  it('falls back to Unavailable when city is missing', () => {
    render(<HotelQuickFacts hotelKey="g1-d2" hotelName="X" city="" />);
    // City value becomes "Unavailable" too
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThanOrEqual(5);
  });
});
