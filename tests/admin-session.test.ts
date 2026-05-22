import { describe, expect, it } from 'vitest';
import { isAdminUser } from '@/lib/admin-session';

describe('admin session allowlist', () => {
  it('fails closed without an admin allowlist', () => {
    expect(isAdminUser({ id: 'user-1', email: 'admin@example.com' }, {})).toBe(false);
  });

  it('accepts exact Kinde user ids and email addresses from env allowlists', () => {
    expect(isAdminUser(
      { id: 'user-1', email: 'owner@example.com' },
      { ADMIN_USER_IDS: 'user-1', ADMIN_EMAILS: '' }
    )).toBe(true);

    expect(isAdminUser(
      { id: 'user-2', email: 'Owner@Example.com' },
      { ADMIN_USER_IDS: '', ADMIN_EMAILS: 'owner@example.com' }
    )).toBe(true);
  });
});
