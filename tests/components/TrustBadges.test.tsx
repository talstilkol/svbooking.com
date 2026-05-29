// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TrustBadges from '@/components/TrustBadges';

describe('TrustBadges', () => {
  it('renders all 4 trust badges', () => {
    render(<TrustBadges />);
    expect(screen.getByText('Secure & Private')).toBeInTheDocument();
    expect(screen.getByText('Free To Browse')).toBeInTheDocument();
    expect(screen.getByText('Provider Rates')).toBeInTheDocument();
    // Dynamic city count badge
    expect(screen.getByText(/\d+ Cities/)).toBeInTheDocument();
  });

  it('shows catalog hotel count in badge description', () => {
    render(<TrustBadges />);
    expect(screen.getByText(/\d+ catalog hotels/)).toBeInTheDocument();
  });

  it('hides decorative icons from screen readers', () => {
    const { container } = render(<TrustBadges />);
    const icons = container.querySelectorAll('[aria-hidden="true"]');
    expect(icons.length).toBe(4);
  });

  it('accepts custom className', () => {
    const { container } = render(<TrustBadges className="mt-8" />);
    expect(container.firstChild).toHaveClass('mt-8');
  });
});
