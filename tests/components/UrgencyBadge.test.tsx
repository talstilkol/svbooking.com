// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UrgencyBadge from '@/components/UrgencyBadge';

describe('UrgencyBadge', () => {
  it('returns null when providerCount is 0', () => {
    const { container } = render(<UrgencyBadge providerCount={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null for negative counts', () => {
    const { container } = render(<UrgencyBadge providerCount={-1} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows low coverage label when count <= 2', () => {
    render(<UrgencyBadge providerCount={2} />);
    expect(screen.getByText('Low provider response count')).toBeInTheDocument();
  });

  it('shows normal label when count > 2', () => {
    render(<UrgencyBadge providerCount={5} />);
    expect(screen.getByText('Provider response count')).toBeInTheDocument();
  });

  it('uses singular "provider" for count of 1', () => {
    render(<UrgencyBadge providerCount={1} />);
    expect(screen.getByText('1 provider returned prices')).toBeInTheDocument();
  });

  it('uses plural "providers" for count > 1', () => {
    render(<UrgencyBadge providerCount={3} />);
    expect(screen.getByText('3 providers returned prices')).toBeInTheDocument();
  });
});
