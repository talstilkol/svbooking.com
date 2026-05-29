// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Testimonials from '@/components/Testimonials';

describe('Testimonials', () => {
  it('renders the section heading', () => {
    render(<Testimonials />);
    expect(
      screen.getByRole('heading', { name: /Traveler Feedback/i })
    ).toBeInTheDocument();
  });

  it('shows the unavailable-testimonials notice instead of fabricated reviews', () => {
    render(<Testimonials />);
    expect(
      screen.getByText(/No verified testimonial data is currently stored/i)
    ).toBeInTheDocument();
  });
});
