// @vitest-environment jsdom
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LazySection from '@/components/LazySection';

let observeCallback: (entries: Array<{ isIntersecting: boolean }>) => void;
const observerMethods = { observe: vi.fn(), disconnect: vi.fn() };

class MockIntersectionObserver {
  constructor(cb: typeof observeCallback) {
    observeCallback = cb;
  }
  observe = observerMethods.observe;
  disconnect = observerMethods.disconnect;
  unobserve = vi.fn();
}

beforeEach(() => {
  observerMethods.observe.mockClear();
  observerMethods.disconnect.mockClear();
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LazySection', () => {
  it('renders fallback spinner initially, not children', () => {
    render(
      <LazySection>
        <p>Lazy content</p>
      </LazySection>
    );
    expect(screen.queryByText('Lazy content')).toBeNull();
    // Default fallback is a spinner div
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders children after intersection', () => {
    render(
      <LazySection>
        <p>Lazy content</p>
      </LazySection>
    );
    act(() => {
      observeCallback([{ isIntersecting: true }]);
    });
    expect(screen.getByText('Lazy content')).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeNull();
  });

  it('disconnects observer after becoming visible', () => {
    render(
      <LazySection>
        <p>Content</p>
      </LazySection>
    );
    act(() => {
      observeCallback([{ isIntersecting: true }]);
    });
    expect(observerMethods.disconnect).toHaveBeenCalled();
  });

  it('renders custom fallback when provided', () => {
    render(
      <LazySection fallback={<p>Loading...</p>}>
        <p>Lazy content</p>
      </LazySection>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Lazy content')).toBeNull();
  });

  it('passes className to wrapper div', () => {
    const { container } = render(
      <LazySection className="my-custom-class">
        <p>Content</p>
      </LazySection>
    );
    expect(container.firstChild).toHaveClass('my-custom-class');
  });

  it('observes the wrapper element', () => {
    render(
      <LazySection rootMargin="500px">
        <p>Content</p>
      </LazySection>
    );
    expect(observerMethods.observe).toHaveBeenCalledTimes(1);
  });

  it('ignores non-intersecting entries', () => {
    render(
      <LazySection>
        <p>Lazy content</p>
      </LazySection>
    );
    act(() => {
      observeCallback([{ isIntersecting: false }]);
    });
    expect(screen.queryByText('Lazy content')).toBeNull();
  });
});
