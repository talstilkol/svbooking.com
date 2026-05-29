// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Breadcrumb from '@/components/Breadcrumb';

describe('Breadcrumb', () => {
  it('renders nav with accessible label', () => {
    render(<Breadcrumb items={[{ label: 'Home', href: '/' }]} />);
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
  });

  it('renders linked items except the last', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Search', href: '/search' },
          { label: 'Paris' },
        ]}
      />
    );
    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toHaveAttribute('href', '/');
    const searchLink = screen.getByRole('link', { name: 'Search' });
    expect(searchLink).toHaveAttribute('href', '/search');
    // Last item should not be a link
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Paris').tagName).toBe('SPAN');
  });

  it('renders last item with bold styling', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Current' },
        ]}
      />
    );
    expect(screen.getByText('Current')).toHaveClass('font-medium');
  });

  it('renders separator between items', () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Page' },
        ]}
      />
    );
    const separators = container.querySelectorAll('[aria-hidden="true"]');
    expect(separators.length).toBe(1);
    expect(separators[0].textContent).toBe('/');
  });
});
