import { getCatalogStats } from '@/lib/hotels-catalog';
import { verifyAdminAuth, verifyAdminOnly } from '@/lib/admin-auth';
import { recordAdminAuditEvent } from '@/lib/admin-audit';
import {
  approveCandidate,
  buildCandidateReviewSummary,
  getCandidate,
  listCandidates,
  markCandidateStale,
  rejectCandidate,
  upsertCandidate,
  upsertCandidates,
} from '@/lib/catalog-candidates';
import { assertSameOrigin } from '@/lib/request-origin';
import { errorResponse } from '@/lib/validation';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function booleanParam(value) {
  if (value === null || value === undefined || value === '') return undefined;
  return value === 'true' || value === '1';
}

function candidateInputFromBody(body, fallbackSource = 'manual-admin') {
  return {
    hotelKey: body.hotelKey,
    name: body.name,
    city: body.city,
    country: body.country,
    stars: body.stars,
    lat: body.lat,
    lon: body.lon,
    source: body.source || fallbackSource,
    sourceUrl: body.sourceUrl,
    externalIds: body.externalIds,
    wikidataId: body.wikidataId,
    osmId: body.osmId,
    providerHotelId: body.providerHotelId,
    provenance: body.provenance,
    validationStatus: body.validationStatus,
    priceValidation: body.priceValidation,
  };
}

export async function GET(request) {
  try {
    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const candidates = await listCandidates({
      city: searchParams.get('city') || undefined,
      status: searchParams.get('status') || undefined,
      source: searchParams.get('source') || undefined,
      duplicate: booleanParam(searchParams.get('duplicate')),
      missingProvenance: booleanParam(searchParams.get('missingProvenance')),
      limit: searchParams.get('limit') || undefined,
    });

    const reviewSummary = buildCandidateReviewSummary(candidates);
    const response = {
      ...reviewSummary,
      reviewSummary,
      candidates,
      filters: {
        city: searchParams.get('city') || null,
        status: searchParams.get('status') || null,
        source: searchParams.get('source') || null,
        duplicate: searchParams.get('duplicate') || null,
        missingProvenance: searchParams.get('missingProvenance') || null,
        limit: searchParams.get('limit') || null,
      },
    };

    if (searchParams.get('stats') === 'true') {
      response.catalogStats = getCatalogStats();
    }

    return Response.json(response, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/catalog/candidates error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const auth = verifyAdminOnly(request);
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const action = body.action || 'ingest';

    if (action === 'ingest' && Array.isArray(body.candidates)) {
      const result = await upsertCandidates(body.candidates.map((candidate) => candidateInputFromBody(candidate, body.source || 'manual-admin')), {
        source: body.source || 'manual-admin',
      });
      await recordAdminAuditEvent({
        request,
        actor: auth.subject,
        action: 'catalog.candidates.bulk-ingest',
        resource: 'catalog:candidates',
        status: result.saved > 0 ? 'success' : 'failure',
        details: { saved: result.saved, skipped: result.skipped, ids: result.ids.slice(0, 20) },
      });
      return Response.json(result, { status: result.saved > 0 ? 200 : 400, headers: NO_STORE_HEADERS });
    }

    if (action === 'approve-all' || action === 'add-all') {
      const pending = await listCandidates({ status: 'pending' });
      let approved = 0;
      let added = 0;
      let skipped = 0;
      const failures = [];

      for (const candidate of pending) {
        const result = await approveCandidate(candidate.id, { actor: auth.subject });
        if (result.approved) {
          approved++;
          if (result.added) added++;
          else skipped++;
        } else {
          skipped++;
          failures.push({ id: candidate.id, error: result.error });
        }
      }

      await recordAdminAuditEvent({
        request,
        actor: auth.subject,
        action: 'catalog.candidates.approve-all',
        resource: 'catalog:candidates',
        details: { approved, added, skipped, failures: failures.slice(0, 20) },
      });

      return Response.json({ approved, added, skipped, failures, catalogStats: getCatalogStats() }, { headers: NO_STORE_HEADERS });
    }

    if (action === 'approve' || action === 'reject' || action === 'stale' || action === 'get') {
      const id = body.id || body.candidateId;
      if (!id) {
        return Response.json({ error: 'Missing required field: id' }, { status: 400, headers: NO_STORE_HEADERS });
      }

      if (action === 'get') {
        const candidate = await getCandidate(id);
        return Response.json({ candidate }, { status: candidate ? 200 : 404, headers: NO_STORE_HEADERS });
      }

      const result = action === 'approve'
        ? await approveCandidate(id, { actor: auth.subject })
        : action === 'reject'
          ? await rejectCandidate(id, { actor: auth.subject, reason: body.reason })
          : await markCandidateStale(id, { actor: auth.subject, reason: body.reason });

      const ok = Boolean(result.approved || result.rejected || result.stale);
      await recordAdminAuditEvent({
        request,
        actor: auth.subject,
        action: `catalog.candidates.${action}`,
        resource: id,
        status: ok ? 'success' : 'failure',
        details: { id, reason: body.reason, error: result.error, added: result.added },
      });

      return Response.json(
        { ...result, catalogStats: action === 'approve' ? getCatalogStats() : undefined },
        { status: ok ? 200 : action === 'approve' ? 400 : 404, headers: NO_STORE_HEADERS }
      );
    }

    const candidateInput = candidateInputFromBody(body);
    if (!candidateInput.name || !candidateInput.city) {
      return Response.json({ error: 'Missing required fields: name, city' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const result = await upsertCandidate(candidateInput, { source: candidateInput.source || 'manual-admin' });
    await recordAdminAuditEvent({
      request,
      actor: auth.subject,
      action: 'catalog.candidates.ingest',
      resource: result.candidate.id,
      status: result.saved ? 'success' : 'failure',
      details: {
        candidateId: result.candidate.id,
        hotelKey: candidateInput.hotelKey,
        city: candidateInput.city,
        country: candidateInput.country,
        source: candidateInput.source,
        saved: result.saved,
        reason: result.reason,
      },
    });

    return Response.json(
      {
        queued: result.saved,
        candidate: result.candidate,
        message: result.saved ? `${candidateInput.name} queued for review` : result.reason,
        catalogStats: getCatalogStats(),
      },
      { status: result.saved ? 200 : 400, headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
