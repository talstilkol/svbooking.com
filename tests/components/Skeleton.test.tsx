// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Skeleton, { CardSkeleton, CardGridSkeleton } from '@/components/Skeleton';

describe('Skeleton', () => {
  it('renders with pulse animation', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('accepts custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    expect(container.firstChild).toHaveClass('h-4', 'w-32');
  });
});

describe('CardSkeleton', () => {
  it('renders an image placeholder and text placeholders', () => {
    const { container } = render(<CardSkeleton />);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
    // Image placeholder
    expect(container.querySelector('.h-48')).toBeTruthy();
  });
});

describe('CardGridSkeleton', () => {
  it('renders 6 cards by default', () => {
    const { container } = render(<CardGridSkeleton />);
    const cards = container.querySelectorAll('.animate-pulse');
    expect(cards.length).toBe(6);
  });

  it('renders custom count', () => {
    const { container } = render(<CardGridSkeleton count={3} />);
    const cards = container.querySelectorAll('.animate-pulse');
    expect(cards.length).toBe(3);
  });
});
