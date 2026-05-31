import { timingSafeEqual } from 'node:crypto';

/**
 * Shared bearer-token auth for admin mutation endpoints.
 * Accepts ADMIN_API_SECRET first, with CRON_SECRET as a deployment fallback.
 */

function timingSafeSecretEqual(candidate, expected) {
  const candidateBuffer = Buffer.from(String(candidate || ''), 'utf8');
  const expectedBuffer = Buffer.from(String(expected), 'utf8');
  const length = Math.max(candidateBuffer.length, expectedBuffer.length, 1);
  const paddedCandidate = Buffer.alloc(length);
  const paddedExpected = Buffer.alloc(length);

  candidateBuffer.copy(paddedCandidate);
  expectedBuffer.copy(paddedExpected);

  return timingSafeEqual(paddedCandidate, paddedExpected) && candidateBuffer.length === expectedBuffer.length;
}

function bearerTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
  const prefix = 'Bearer ';
  if (!authHeader.startsWith(prefix)) return '';
  return authHeader.slice(prefix.length);
}

/**
 * Verify admin auth — accepts ADMIN_API_SECRET or CRON_SECRET.
 * Use for endpoints that need to be called by both admin users and cron jobs.
 */
export function verifyAdminAuth(request) {
  const headers = { 'Cache-Control': 'no-store' };
  const allowedSecrets = [
    { subject: 'admin-api-secret', value: process.env.ADMIN_API_SECRET },
    { subject: 'cron-secret', value: process.env.CRON_SECRET },
  ].filter((entry) => Boolean(entry.value));

  if (allowedSecrets.length === 0) {
    return {
      authorized: false,
      response: Response.json(
        { error: 'Admin API secret is not configured' },
        { status: 403, headers }
      ),
    };
  }

  const token = bearerTokenFromRequest(request);
  const match = allowedSecrets.find((entry) => timingSafeSecretEqual(token, entry.value));

  if (match) return { authorized: true, subject: match.subject };

  return {
    authorized: false,
    response: Response.json({ error: 'Unauthorized' }, { status: 401, headers }),
  };
}

/**
 * Strict admin-only auth — accepts ONLY ADMIN_API_SECRET.
 * Use for mutation endpoints (catalog approval, etc.) where cron access is not appropriate.
 */
export function verifyAdminOnly(request) {
  const headers = { 'Cache-Control': 'no-store' };
  const adminSecret = process.env.ADMIN_API_SECRET;

  if (!adminSecret) {
    return {
      authorized: false,
      response: Response.json(
        { error: 'Admin API secret is not configured' },
        { status: 403, headers }
      ),
    };
  }

  const token = bearerTokenFromRequest(request);
  if (timingSafeSecretEqual(token, adminSecret)) {
    return { authorized: true, subject: 'admin-api-secret' };
  }

  return {
    authorized: false,
    response: Response.json({ error: 'Unauthorized' }, { status: 401, headers }),
  };
}
