// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RatingBadge from '@/components/RatingBadge';

describe('RatingBadge', () => {
  it('renders N/A badge at default (md) size', () => {
    render(<RatingBadge />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('Rating unavailable')).toBeInTheDocument();
  });

  it('renders compact badge at sm size', () => {
    render(<RatingBadge size="sm" />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('Rating unavailable')).toBeInTheDocument();
  });

  it('renders detailed badge at lg size with review source note', () => {
    render(<RatingBadge size="lg" />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('No verified review source connected')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<RatingBadge className="mt-4" />);
    expect(container.firstChild).toHaveClass('mt-4');
  });
});
