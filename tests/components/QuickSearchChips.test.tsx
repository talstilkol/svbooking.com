// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import QuickSearchChips from '@/components/QuickSearchChips';

describe('QuickSearchChips', () => {
  it('renders the Popular label and 8 search chips', () => {
    render(<QuickSearchChips />);
    expect(screen.getByText('Popular:')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(8);
  });

  it('links each chip to a city search query', () => {
    render(<QuickSearchChips />);
    expect(screen.getByRole('link', { name: 'Beach Hotels' })).toHaveAttribute('href', '/search?city=Bali');
    expect(screen.getByRole('link', { name: 'Romantic' })).toHaveAttribute('href', '/search?city=Paris');
    expect(screen.getByRole('link', { name: 'Business' })).toHaveAttribute('href', '/search?city=Tokyo');
  });

  it('accepts custom className', () => {
    const { container } = render(<QuickSearchChips className="mt-4" />);
    expect(container.firstChild).toHaveClass('mt-4');
  });
});
