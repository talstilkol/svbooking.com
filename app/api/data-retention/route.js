import { getDataRetentionPolicies, getDataRetentionReadiness } from '@/lib/data-retention';
import { verifyAdminAuth } from '@/lib/admin-auth';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request) {
  const auth = verifyAdminAuth(request);
  if (!auth.authorized) return auth.response;

  return Response.json(
    {
      service: 'sv-booking',
      status: 'defined',
      readiness: getDataRetentionReadiness(),
      policies: getDataRetentionPolicies(),
    },
    { headers: NO_STORE_HEADERS }
  );
}
