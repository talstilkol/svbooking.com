// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoyaltyBanner from '@/components/LoyaltyBanner';

describe('LoyaltyBanner', () => {
  it('renders nothing (no fabricated loyalty program)', () => {
    const { container } = render(<LoyaltyBanner />);
    expect(container.firstChild).toBeNull();
  });
});
