import { kv } from '@/lib/kv';
import { findHotel, getCatalogStats } from '@/lib/hotels-catalog';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { recordAdminAuditEvent } from '@/lib/admin-audit';
import {
  approveCandidate,
  buildCandidateReviewSummary,
  getCandidate,
  listCandidates,
  markCandidateStale,
  rejectCandidate,
  upsertCandidate,
} from '@/lib/catalog-candidates';
import { assertSameOrigin } from '@/lib/request-origin';
import { errorResponse } from '@/lib/validation';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function booleanParam(value) {
  if (value === null || value === undefined || value === '') return undefined;
  return value === 'true' || value === '1';
}

/**
 * GET /api/agents/discovered
 * Returns hotel candidates discovered by the discovery agents.
 *
 * Optional query params:
 *   ?city=Paris  — filter by city
 *   ?stats=true  — also return catalog stats
 */
export async function GET(request) {
  try {
    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const cityFilter = searchParams.get('city');
    const includeStats = searchParams.get('stats') === 'true';

    const statusFilter = searchParams.get('status');
    const candidates = await listCandidates({
      city: cityFilter || undefined,
      status: statusFilter || undefined,
      source: searchParams.get('source') || undefined,
      duplicate: booleanParam(searchParams.get('duplicate')),
      missingProvenance: booleanParam(searchParams.get('missingProvenance')),
      limit: searchParams.get('limit') || undefined,
    });

    // Backward-compatible read-only view of legacy discovered:hotels:* keys.
    // Agents now write candidates, but old queues may still exist in local KV.
    const discoveredKeys = await kv.keys('discovered:hotels:*');
    const legacyDiscovered = [];
    if (discoveredKeys.length > 0) {
      const values = await kv.mget(discoveredKeys);
      for (let i = 0; i < discoveredKeys.length; i++) {
        const cityName = discoveredKeys[i].replace('discovered:hotels:', '');
        const hotels = values[i];
        if (!Array.isArray(hotels)) continue;
        for (const hotel of hotels) {
          const alreadyInCatalog = Boolean(findHotel(hotel.hotelKey));
          legacyDiscovered.push({
            ...hotel,
            id: hotel.id || hotel.hotelKey,
            status: alreadyInCatalog ? 'approved' : 'pending',
            discoveredForCity: cityName,
            alreadyInCatalog,
            legacy: true,
          });
        }
      }
    }

    const filteredLegacy = cityFilter
      ? legacyDiscovered.filter(
          (h) => h.discoveredForCity.toLowerCase() === cityFilter.toLowerCase() ||
                 h.city?.toLowerCase() === cityFilter.toLowerCase()
        )
      : legacyDiscovered;

    const hotels = [...candidates, ...filteredLegacy];
    hotels.sort((a, b) => {
      if (a.alreadyInCatalog !== b.alreadyInCatalog) return a.alreadyInCatalog ? 1 : -1;
      return (a.city || '').localeCompare(b.city || '');
    });

    const reviewSummary = buildCandidateReviewSummary(hotels);
    const response = {
      ...reviewSummary,
      citiesScanned: discoveredKeys.length,
      hotels,
      candidates: hotels,
      reviewSummary,
    };

    if (includeStats) {
      response.catalogStats = getCatalogStats();
    }

    return Response.json(response, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/agents/discovered error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

/**
 * POST /api/agents/discovered
 * Candidate review actions:
 *   { action: 'ingest', hotelKey, name, city, country, source? }
 *   { action: 'approve', id }
 *   { action: 'reject', id, reason? }
 *   { action: 'stale', id, reason? }
 *   { action: 'approve-all' } / { action: 'add-all' } approve all promotable pending candidates
 */
export async function POST(request) {
  try {
    assertSameOrigin(request);

    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    const body = await request.json();

    const action = body.action || 'ingest';

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
        resource: 'catalog',
        details: { approved, added, skipped, failures: failures.slice(0, 20) },
      });

      return Response.json(
        {
          approved,
          added,
          skipped,
          failures,
          message: `Approved ${approved} candidates (${added} new catalog entries, ${skipped} skipped)`,
          catalogStats: getCatalogStats(),
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (action === 'approve') {
      const id = body.id || body.candidateId;
      if (!id) {
        return Response.json(
          { error: 'Missing required field: id' },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      const result = await approveCandidate(id, { actor: auth.subject });
      await recordAdminAuditEvent({
        request,
        actor: auth.subject,
        action: 'catalog.candidates.approve',
        resource: id,
        status: result.approved ? 'success' : 'failure',
        details: { id, added: result.added, error: result.error },
      });

      return Response.json(
        {
          approved: result.approved,
          added: result.added || false,
          error: result.error,
          candidate: result.candidate,
          catalogStats: getCatalogStats(),
        },
        { status: result.approved ? 200 : 400, headers: NO_STORE_HEADERS }
      );
    }

    if (action === 'reject') {
      const id = body.id || body.candidateId;
      if (!id) {
        return Response.json(
          { error: 'Missing required field: id' },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      const result = await rejectCandidate(id, { actor: auth.subject, reason: body.reason });
      await recordAdminAuditEvent({
        request,
        actor: auth.subject,
        action: 'catalog.candidates.reject',
        resource: id,
        status: result.rejected ? 'success' : 'failure',
        details: { id, reason: body.reason, error: result.error },
      });

      return Response.json(
        {
          rejected: result.rejected,
          error: result.error,
          candidate: result.candidate,
        },
        { status: result.rejected ? 200 : 404, headers: NO_STORE_HEADERS }
      );
    }

    if (action === 'stale') {
      const id = body.id || body.candidateId;
      if (!id) {
        return Response.json(
          { error: 'Missing required field: id' },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      const result = await markCandidateStale(id, { actor: auth.subject, reason: body.reason });
      await recordAdminAuditEvent({
        request,
        actor: auth.subject,
        action: 'catalog.candidates.stale',
        resource: id,
        status: result.stale ? 'success' : 'failure',
        details: { id, reason: body.reason, error: result.error },
      });

      return Response.json(
        {
          stale: result.stale,
          error: result.error,
          candidate: result.candidate,
        },
        { status: result.stale ? 200 : 404, headers: NO_STORE_HEADERS }
      );
    }

    if (action === 'get') {
      const candidate = await getCandidate(body.id || body.candidateId);
      return Response.json({ candidate }, { status: candidate ? 200 : 404, headers: NO_STORE_HEADERS });
    }

    const {
      hotelKey,
      name,
      city,
      country,
      stars,
      source,
      sourceUrl,
      lat,
      lon,
      externalIds,
      provenance,
      wikidataId,
      osmId,
      providerHotelId,
    } = body;
    if (!name || !city) {
      return Response.json(
        { error: 'Missing required fields: name, city' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const result = await upsertCandidate(
      {
        hotelKey,
        name,
        city,
        country,
        stars,
        source: source || 'manual-admin',
        sourceUrl,
        lat,
        lon,
        externalIds,
        provenance,
        wikidataId,
        osmId,
        providerHotelId,
      },
      { source: source || 'manual-admin' }
    );

    await recordAdminAuditEvent({
      request,
      actor: auth.subject,
      action: 'catalog.candidates.ingest',
      resource: result.candidate.id,
      status: result.saved ? 'success' : 'failure',
      details: { candidateId: result.candidate.id, hotelKey, city, country, saved: result.saved, reason: result.reason },
    });

    return Response.json(
      {
        queued: result.saved,
        candidate: result.candidate,
        message: result.saved ? `${name} queued for review` : result.reason,
        catalogStats: getCatalogStats(),
      },
      { status: result.saved ? 200 : 400, headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
