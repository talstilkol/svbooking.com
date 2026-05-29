// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const mockState: { items: Array<{ hotelKey: string; name: string; image: string }>; hydrated: boolean } = {
  items: [],
  hydrated: true,
};
vi.mock('@/lib/useLocalStorage', () => ({
  useRecentlyViewed: () => mockState,
}));

import RecentlyViewed from '@/components/RecentlyViewed';

describe('RecentlyViewed', () => {
  it('renders nothing when there are no items', () => {
    mockState.items = [];
    mockState.hydrated = true;
    const { container } = render(<RecentlyViewed />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing before hydration', () => {
    mockState.items = [{ hotelKey: 'g1-d2', name: 'Le Meurice', image: '/i.jpg' }];
    mockState.hydrated = false;
    const { container } = render(<RecentlyViewed />);
    expect(container.firstChild).toBeNull();
  });

  it('renders viewed hotels once hydrated', () => {
    mockState.items = [
      { hotelKey: 'g1-d2', name: 'Le Meurice', image: '/a.jpg' },
      { hotelKey: 'g1-d3', name: 'Ritz Paris', image: '/b.jpg' },
    ];
    mockState.hydrated = true;
    render(<RecentlyViewed />);
    expect(screen.getByText('Recently viewed')).toBeInTheDocument();
    expect(screen.getByText('Le Meurice')).toBeInTheDocument();
    expect(screen.getByText('Ritz Paris')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Le Meurice/ })).toHaveAttribute('href', '/hotel/g1-d2');
  });
});
