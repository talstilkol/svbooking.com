import { getCurrentUser } from '@/lib/auth';
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const statusLimiter = rateLimit({ namespace: 'me-status', limit: 60, window: 60, failOpen: true });

/**
 * Lightweight auth-status endpoint for client UI (e.g. Navbar).
 * Always returns 200 with { authenticated, user } and never throws —
 * when Kinde is not configured or the user is signed out, authenticated is false.
 */
export async function GET(request) {
  const { success, reset } = await statusLimiter.check(getClientIp(request));
  if (!success) return rateLimitResponse(reset);

  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return Response.json({ authenticated: false, user: null }, { headers: NO_STORE_HEADERS });
    }
    return Response.json(
      {
        authenticated: true,
        user: {
          id: user.id,
          givenName: user.given_name || user.givenName || null,
          email: user.email || null,
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch {
    // Kinde not configured / session lookup failed — treat as signed out.
    return Response.json({ authenticated: false, user: null }, { headers: NO_STORE_HEADERS });
  }
}
