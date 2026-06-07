// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RouteErrorState from '@/components/RouteErrorState';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

const originalConsoleError = console.error;

beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

function renderErrorState(reset = vi.fn()) {
  render(
    <LocaleProvider>
      <LocaleSwitcher />
      <RouteErrorState
        error={Object.assign(new Error('Route failed'), { digest: 'digest-123' })}
        reset={reset}
        icon="!"
        titleKey="routeErrorSearchTitle"
        descriptionKey="routeErrorSearchDesc"
        secondaryHref="/"
        secondaryLabelKey="routeErrorGoHome"
        consoleLabel="Search page error"
      />
    </LocaleProvider>
  );
  return { reset };
}

describe('RouteErrorState', () => {
  it('renders digest, logs the error, and calls reset', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    renderErrorState(reset);

    expect(screen.getByText('Search unavailable')).toBeInTheDocument();
    expect(screen.getByText('Error ID: digest-123')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go Home' })).toHaveAttribute('href', '/');
    expect(console.error).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('switches route error copy to Hebrew', async () => {
    const user = userEvent.setup();
    renderErrorState();

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByText('החיפוש לא זמין')).toBeInTheDocument();
    expect(screen.getByText('מזהה שגיאה: digest-123')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'חזרה לדף הבית' })).toHaveAttribute('href', '/');
  });
});
