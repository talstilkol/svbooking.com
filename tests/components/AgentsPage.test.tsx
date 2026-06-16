// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const localeStore = vi.hoisted(() => ({} as Record<string, unknown>));

vi.mock('@/components/AgentDashboard', () => ({
  default: () => <div data-testid="agent-dashboard" />,
}));

vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { locale: 'svbooking:locale' },
  readLocalStorageStringWithFallback: (key: string) =>
    (localeStore[key] as string | undefined) ?? null,
  writeLocalStorageJson: (key: string, value: unknown) => {
    localeStore[key] = value;
  },
}));

import AgentsPage from '@/app/agents/page';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { LocaleProvider } from '@/components/LocaleProvider';

describe('AgentsPage localization', () => {
  beforeEach(() => {
    for (const key of Object.keys(localeStore)) delete localeStore[key];
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  });

  it('renders the agents hero in English by default', () => {
    render(<AgentsPage />);

    expect(screen.getByRole('link', { name: /Home/u })).toHaveAttribute('href', '/');
    expect(screen.getByRole('heading', { name: 'AI Agents Dashboard' })).toBeInTheDocument();
    expect(
      screen.getByText('Automated deal scanning, health monitoring, and personalized recommendations')
    ).toBeInTheDocument();
    expect(screen.getByTestId('agent-dashboard')).toBeInTheDocument();
  });

  it('switches the agents hero to Hebrew without changing dashboard mounting', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <AgentsPage />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByRole('link', { name: /דף הבית/u })).toHaveAttribute('href', '/');
    expect(screen.getByRole('heading', { name: 'לוח סוכני AI' })).toBeInTheDocument();
    expect(
      screen.getByText('סריקת מבצעים, ניטור בריאות והמלצות מותאמות אישית באופן אוטומטי')
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'AI Agents Dashboard' })).not.toBeInTheDocument();
    expect(screen.getByTestId('agent-dashboard')).toBeInTheDocument();
  });
});
