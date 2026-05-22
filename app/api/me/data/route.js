import { requireUser } from '@/lib/auth';
import { deleteUserData, getUserDataSnapshot, USER_DATA_DELETE_CONFIRMATION } from '@/lib/user-data';
import { errorResponse, ValidationError } from '@/lib/validation';
import { assertSameOrigin } from '@/lib/request-origin';
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const userDataExportLimiter = rateLimit({ namespace: 'user-data-export', limit: 10, window: 60, failOpen: false });
const userDataDeletionLimiter = rateLimit({ namespace: 'user-data-delete', limit: 5, window: 60, failOpen: false });

async function enforceUserDataExportRateLimit(request) {
  const { success, reset } = await userDataExportLimiter.check(getClientIp(request));
  return success ? null : rateLimitResponse(reset);
}

async function enforceUserDataDeletionRateLimit(request) {
  const { success, reset } = await userDataDeletionLimiter.check(getClientIp(request));
  return success ? null : rateLimitResponse(reset);
}

export async function GET(request) {
  try {
    const limited = await enforceUserDataExportRateLimit(request);
    if (limited) return limited;

    const user = await requireUser();
    const snapshot = await getUserDataSnapshot(user.id);
    return Response.json(snapshot, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request) {
  try {
    assertSameOrigin(request);
    const limited = await enforceUserDataDeletionRateLimit(request);
    if (limited) return limited;

    const user = await requireUser();
    const confirmation = request.headers.get('x-sv-confirm-delete') || '';
    if (confirmation !== USER_DATA_DELETE_CONFIRMATION) {
      throw new ValidationError('Deletion confirmation header required');
    }

    const result = await deleteUserData(user.id);
    return Response.json(result, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return errorResponse(err);
  }
}
