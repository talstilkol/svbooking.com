// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FeatureHighlight from '@/components/FeatureHighlight';

describe('FeatureHighlight', () => {
  it('renders the section heading', () => {
    render(<FeatureHighlight />);
    expect(screen.getByText(/Power Features/i)).toBeInTheDocument();
  });

  it('renders feature links with correct hrefs', () => {
    render(<FeatureHighlight />);
    expect(screen.getByRole('link', { name: /Side-by-Side Compare/i })).toHaveAttribute('href', '/compare-hotels');
    expect(screen.getByRole('link', { name: /Cheaper Dates Finder/i })).toHaveAttribute('href', '/compare');
    expect(screen.getByRole('link', { name: /Verified Deals Feed/i })).toHaveAttribute('href', '/deals');
    expect(screen.getByRole('link', { name: /Destination Explorer/i })).toHaveAttribute('href', '/explore');
  });

  it('renders exactly 4 feature links', () => {
    render(<FeatureHighlight />);
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('accepts custom className', () => {
    const { container } = render(<FeatureHighlight className="mt-10" />);
    expect(container.firstChild).toHaveClass('mt-10');
  });
});
