import { getCurrentUser } from './auth';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function parseList(value) {
  return new Set(
    String(value || '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

function userEmail(user) {
  return String(user?.email || user?.email_address || user?.emailAddress || '').trim().toLowerCase();
}

export function isAdminUser(user, env = process.env) {
  if (!user?.id) return false;
  const allowedIds = parseList(env.ADMIN_USER_IDS);
  const allowedEmails = parseList(env.ADMIN_EMAILS);
  if (allowedIds.size === 0 && allowedEmails.size === 0) return false;
  return allowedIds.has(String(user.id).toLowerCase()) || allowedEmails.has(userEmail(user));
}

export async function verifyAdminSession({ env = process.env } = {}) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return {
      authorized: false,
      response: Response.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS }),
    };
  }

  if (!isAdminUser(user, env)) {
    return {
      authorized: false,
      response: Response.json({ error: 'Admin dashboard access is not configured for this user' }, { status: 403, headers: NO_STORE_HEADERS }),
    };
  }

  return {
    authorized: true,
    subject: `kinde:${user.id}`,
    user,
  };
}
