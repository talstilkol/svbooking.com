// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProviderLogos from '@/components/ProviderLogos';

describe('ProviderLogos', () => {
  it('renders the rate-sources label and 3 coverage states', () => {
    render(<ProviderLogos />);
    expect(screen.getByText('Rate sources:')).toBeInTheDocument();
    expect(screen.getByText('Configured sources only')).toBeInTheDocument();
    expect(screen.getByText('Links only when returned')).toBeInTheDocument();
    expect(screen.getByText('Missing rates stay unavailable')).toBeInTheDocument();
  });

  it('exposes a coverage-policy aria-label', () => {
    render(<ProviderLogos />);
    expect(screen.getByLabelText('Pricing source coverage policy')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<ProviderLogos className="mt-2" />);
    expect(container.firstChild).toHaveClass('mt-2');
  });
});
