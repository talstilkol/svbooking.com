// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HotelBadges from '@/components/HotelBadges';

describe('HotelBadges', () => {
  it('renders the unavailable-badges notice', () => {
    render(<HotelBadges />);
    expect(
      screen.getByText(/Verified property badges are unavailable/i)
    ).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<HotelBadges className="mt-4" />);
    expect(container.firstChild).toHaveClass('mt-4');
  });
});
