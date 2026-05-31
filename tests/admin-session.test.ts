import { describe, expect, it } from 'vitest';
import { isAdminUser } from '@/lib/admin-session';

describe('admin session allowlist', () => {
  it('fails closed without an admin allowlist', () => {
    expect(isAdminUser({ id: 'user-1', email: 'admin@example.com' }, {} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('accepts exact Kinde user ids and email addresses from env allowlists', () => {
    expect(isAdminUser(
      { id: 'user-1', email: 'owner@example.com' },
      { ADMIN_USER_IDS: 'user-1', ADMIN_EMAILS: '' } as unknown as NodeJS.ProcessEnv
    )).toBe(true);

    expect(isAdminUser(
      { id: 'user-2', email: 'Owner@Example.com' },
      { ADMIN_USER_IDS: '', ADMIN_EMAILS: 'owner@example.com' } as unknown as NodeJS.ProcessEnv
    )).toBe(true);
  });

  it('normalizes comma-separated allowlists and supported email field variants', () => {
    expect(isAdminUser(
      { id: 'USER-3', email_address: 'ops@example.com' },
      {
        ADMIN_USER_IDS: ' user-1, user-3 ',
        ADMIN_EMAILS: '',
      } as unknown as NodeJS.ProcessEnv
    )).toBe(true);

    expect(isAdminUser(
      { id: 'user-4', emailAddress: 'Ops@Example.com' },
      {
        ADMIN_USER_IDS: '',
        ADMIN_EMAILS: 'owner@example.com, ops@example.com',
      } as unknown as NodeJS.ProcessEnv
    )).toBe(true);

    expect(isAdminUser(
      { id: '', email: 'ops@example.com' },
      {
        ADMIN_USER_IDS: 'user-4',
        ADMIN_EMAILS: 'ops@example.com',
      } as unknown as NodeJS.ProcessEnv
    )).toBe(false);
  });
});
