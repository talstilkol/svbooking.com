// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import Testimonials from '@/components/Testimonials';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

describe('Testimonials', () => {
  it('renders the section heading', () => {
    render(<Testimonials />);
    expect(
      screen.getByRole('heading', { name: /Traveler Feedback/i })
    ).toBeInTheDocument();
  });

  it('shows the unavailable-testimonials notice instead of fabricated reviews', () => {
    render(<Testimonials />);
    expect(
      screen.getByText(/No verified testimonial data is currently stored/i)
    ).toBeInTheDocument();
  });

  it('switches testimonial unavailable states to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <Testimonials />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByRole('heading', { name: 'משוב מטיילים' })).toBeInTheDocument();
    expect(screen.getByText('עדויות מטיילים מאומתות אינן זמינות עד לשילוב מקור ביקורות אמיתי.')).toBeInTheDocument();
    expect(screen.getByText('לא שמורים כרגע נתוני עדויות מאומתים עבור מוצר זה.')).toBeInTheDocument();
  });
});
