import { getDataRetentionPolicies, getDataRetentionReadiness } from '@/lib/data-retention';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET() {
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
