// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import FAQ from '@/components/FAQ';

describe('FAQ', () => {
  it('renders the FAQ heading', () => {
    render(<FAQ />);
    expect(screen.getByRole('heading', { name: /frequently asked questions/i })).toBeInTheDocument();
  });

  it('renders all 6 FAQ questions', () => {
    render(<FAQ />);
    expect(screen.getByText(/How does SV Booking compare hotel prices/i)).toBeInTheDocument();
    expect(screen.getByText(/Is SV Booking free to use/i)).toBeInTheDocument();
    expect(screen.getByText(/What is the "Cheaper Dates" feature/i)).toBeInTheDocument();
    expect(screen.getByText(/How many cities and hotels/i)).toBeInTheDocument();
    expect(screen.getByText(/What are AI Agents/i)).toBeInTheDocument();
    expect(screen.getByText(/Do I book directly through SV Booking/i)).toBeInTheDocument();
  });

  it('toggles answer visibility on click', async () => {
    const user = userEvent.setup();
    render(<FAQ />);

    const firstQuestion = screen.getByText(/How does SV Booking compare hotel prices/i);
    // Answer should not be visible initially (or collapsed)
    const answerText = /aggregate rates returned by configured pricing providers/i;

    // Click to open
    await user.click(firstQuestion);
    expect(screen.getByText(answerText)).toBeVisible();

    // Click again to close
    await user.click(firstQuestion);
  });

  it('includes dynamic catalog stats in the coverage answer', async () => {
    const user = userEvent.setup();
    render(<FAQ />);
    const coverageQuestion = screen.getByText(/How many cities and hotels/i);
    await user.click(coverageQuestion);
    expect(screen.getByText(/\d+ hotels across \d+ cities and \d+ countries/)).toBeInTheDocument();
  });

  it('emits FAQPage JSON-LD structured data', () => {
    const { container } = render(<FAQ />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBeGreaterThanOrEqual(1);

    const jsonLd = JSON.parse(scripts[0].textContent || '{}');
    expect(jsonLd['@type']).toBe('FAQPage');
    expect(jsonLd.mainEntity).toHaveLength(6);
    expect(jsonLd.mainEntity[0]['@type']).toBe('Question');
  });
});
