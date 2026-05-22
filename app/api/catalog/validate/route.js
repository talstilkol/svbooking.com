import { getRates } from '@/lib/xotelo';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { recordAdminAuditEvent } from '@/lib/admin-audit';
import { assertSameOrigin } from '@/lib/request-origin';
import { errorResponse } from '@/lib/validation';

// Rate limiter: 10 validation requests per minute per IP
const validateLimiter = rateLimit({ namespace: 'catalog-validate', limit: 10, window: 60, failOpen: false });
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

/**
 * POST /api/catalog/validate
 * Body: { hotels: [{ hotelKey, name, city, country }] }
 *
 * Validates discovered hotel keys against the Xotelo API.
 * Returns which keys are valid (have pricing data) and which aren't.
 */
export async function POST(request) {
  try {
    assertSameOrigin(request);

    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    // Rate limit to prevent Xotelo API abuse
    const ip = getClientIp(request);
    const { success, reset } = await validateLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const body = await request.json();
    const hotels = body.hotels || [];

    if (hotels.length === 0) {
      return Response.json({ error: 'No hotels provided' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    // Limit batch size to prevent timeout
    const batch = hotels.slice(0, 10);

    // Generate test dates (30 days out, 2 nights)
    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + 30);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + 2);
    const checkInStr = checkIn.toISOString().split('T')[0];
    const checkOutStr = checkOut.toISOString().split('T')[0];

    const results = await Promise.allSettled(
      batch.map(async (hotel) => {
        const start = Date.now();
        try {
          const data = await getRates({
            hotelKey: hotel.hotelKey,
            checkIn: checkInStr,
            checkOut: checkOutStr,
            timeoutMs: 10000,
          });
          const rates = (data?.rates || []).filter(
            (r) => Number(r.rate || 0) + Number(r.tax || 0) > 0
          );
          return {
            ...hotel,
            valid: rates.length > 0,
            providerCount: rates.length,
            observedPrice: rates.length > 0
              ? Number((Number(rates[0].rate || 0) + Number(rates[0].tax || 0)).toFixed(2))
              : null,
            latencyMs: Date.now() - start,
          };
        } catch {
          return {
            ...hotel,
            valid: false,
            error: 'Validation unavailable',
            latencyMs: Date.now() - start,
          };
        }
      })
    );

    const validated = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);

    const validCount = validated.filter((h) => h.valid).length;

    await recordAdminAuditEvent({
      request,
      actor: auth.subject,
      action: 'catalog.validate',
      resource: 'catalog',
      details: {
        requested: hotels.length,
        tested: validated.length,
        valid: validCount,
        invalid: validated.length - validCount,
      },
    });

    return Response.json({
      tested: validated.length,
      valid: validCount,
      invalid: validated.length - validCount,
      testDates: { checkIn: checkInStr, checkOut: checkOutStr },
      results: validated,
      remaining: hotels.length - batch.length,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
