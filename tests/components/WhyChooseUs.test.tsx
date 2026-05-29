// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WhyChooseUs from '@/components/WhyChooseUs';
import { CATALOG_STATS } from '@/lib/catalog-stats';

describe('WhyChooseUs', () => {
  it('renders the section heading', () => {
    render(<WhyChooseUs />);
    expect(
      screen.getByRole('heading', { name: /Why travelers choose SV Booking/i })
    ).toBeInTheDocument();
  });

  it('renders the reason titles', () => {
    render(<WhyChooseUs />);
    expect(screen.getByText('Compare available providers')).toBeInTheDocument();
    expect(screen.getByText('Find cheaper dates')).toBeInTheDocument();
    expect(screen.getByText('AI-powered agents')).toBeInTheDocument();
    expect(screen.getByText('No sign-up required')).toBeInTheDocument();
  });

  it('includes the dynamic city count from CATALOG_STATS', () => {
    render(<WhyChooseUs />);
    expect(
      screen.getByText(`${CATALOG_STATS.cities} cities worldwide`)
    ).toBeInTheDocument();
  });
});
