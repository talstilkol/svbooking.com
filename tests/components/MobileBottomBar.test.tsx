// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import MobileBottomBar from '@/components/MobileBottomBar';

let pathname = '/search';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

describe('MobileBottomBar', () => {
  beforeEach(() => {
    pathname = '/search';
  });

  it('renders translated mobile navigation and active route state', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <MobileBottomBar />
      </LocaleProvider>
    );

    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Search/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Compare/ })).toHaveAttribute('href', '/compare');

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByRole('navigation', { name: 'ניווט מובייל' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /חיפוש/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /השוואה/ })).toHaveAttribute('href', '/compare');
  });
});
