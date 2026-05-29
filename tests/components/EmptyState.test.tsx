// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EmptyState from '@/components/EmptyState';

describe('EmptyState', () => {
  it('renders title and default icon', () => {
    render(<EmptyState title="No results" />);
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('📭')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    render(<EmptyState title="Empty" icon="🔍" />);
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Try adjusting your filters" />);
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
  });

  it('hides icon from screen readers', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const icon = container.querySelector('[aria-hidden="true"]');
    expect(icon).toBeTruthy();
    expect(icon?.textContent).toBe('📭');
  });

  it('renders action link when provided', () => {
    render(
      <EmptyState
        title="No favorites"
        action={{ label: 'Browse Hotels', href: '/search' }}
      />
    );
    const link = screen.getByRole('link', { name: 'Browse Hotels' });
    expect(link).toHaveAttribute('href', '/search');
  });

  it('does not render action when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('accepts custom className', () => {
    const { container } = render(<EmptyState title="Empty" className="mt-8" />);
    expect(container.firstChild).toHaveClass('mt-8');
  });
});
