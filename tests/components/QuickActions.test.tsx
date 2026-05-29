// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import QuickActions from '@/components/QuickActions';

describe('QuickActions', () => {
  it('renders the heading', () => {
    render(<QuickActions />);
    expect(screen.getByText(/Quick Actions/i)).toBeInTheDocument();
  });

  it('renders all 8 action links', () => {
    render(<QuickActions />);
    expect(screen.getByRole('link', { name: /Search Hotels/i })).toHaveAttribute('href', '/search');
    expect(screen.getByRole('link', { name: /Compare Prices/i })).toHaveAttribute('href', '/compare');
    expect(screen.getByRole('link', { name: /Today's Deals/i })).toHaveAttribute('href', '/deals');
    expect(screen.getByRole('link', { name: /Explore/i })).toHaveAttribute('href', '/explore');
    expect(screen.getByRole('link', { name: /Favorites/i })).toHaveAttribute('href', '/favorites');
    expect(screen.getByRole('link', { name: /My Trips/i })).toHaveAttribute('href', '/trips');
    expect(screen.getByRole('link', { name: /Price History/i })).toHaveAttribute('href', '/compare');
    expect(screen.getByRole('link', { name: /Find Dates/i })).toHaveAttribute('href', '/compare');
  });

  it('renders exactly 8 links', () => {
    render(<QuickActions />);
    expect(screen.getAllByRole('link')).toHaveLength(8);
  });

  it('accepts custom className', () => {
    const { container } = render(<QuickActions className="mt-6" />);
    expect(container.firstChild).toHaveClass('mt-6');
  });
});
