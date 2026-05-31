import { kv } from './kv';
import { hashId } from './utils/hashId';
import { addAndPersistHotel, findHotel } from './hotels-catalog';
import { RETENTION_SECONDS } from './data-retention';
import { normalizeHttpsUrl } from './utils/public-url-safety';

const INDEX_KEY = 'catalog:candidates:index';
const KEY_PREFIX = 'catalog:candidate:';
const TTL_SECONDS = RETENTION_SECONDS.catalogCandidates;
const VALID_STATUSES = new Set(['pending', 'approved', 'rejected', 'stale']);

function candidateKey(id) {
  return `${KEY_PREFIX}${id}`;
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeNullableText(value) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeSourceUrl(value) {
  return normalizeHttpsUrl(value);
}

function firstSafeSourceUrl(...values) {
  for (const value of values) {
    const normalized = normalizeSourceUrl(value);
    if (normalized) return normalized;
  }
  return null;
}

function normalizeProvenance(input, { source, sourceUrl, externalIds, brand } = {}) {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const normalizedSourceUrl = firstSafeSourceUrl(raw.sourceUrl, raw.url, sourceUrl);
  return {
    ...raw,
    source: normalizeNullableText(raw.source || source),
    sourceUrl: normalizedSourceUrl,
    url: normalizedSourceUrl,
    wikidataId: normalizeNullableText(raw.wikidataId || externalIds?.wikidataId),
    osmId: normalizeNullableText(raw.osmId || externalIds?.osmId),
    brand: normalizeNullableText(raw.brand || brand),
  };
}

function normalizeCandidateUrls(candidate) {
  const sourceUrl = normalizeSourceUrl(candidate?.sourceUrl);
  const provenance = normalizeProvenance(candidate?.provenance, {
    source: candidate?.source,
    sourceUrl,
    externalIds: candidate?.externalIds,
  });
  return {
    ...candidate,
    sourceUrl,
    provenance,
  };
}

function normalizeExternalIds(input) {
  const externalIds = {
    wikidataId: normalizeNullableText(input?.wikidataId || input?.externalIds?.wikidataId),
    osmId: normalizeNullableText(input?.osmId || input?.externalIds?.osmId),
    providerHotelId: normalizeNullableText(input?.providerHotelId || input?.externalIds?.providerHotelId),
  };
  return Object.fromEntries(Object.entries(externalIds).filter(([, value]) => Boolean(value)));
}

function hasUsableProvenance(candidate) {
  const provenance = candidate?.provenance || {};
  const externalIds = candidate?.externalIds || {};
  return Boolean(
    normalizeSourceUrl(candidate?.sourceUrl) ||
    normalizeSourceUrl(provenance.sourceUrl || provenance.url) ||
    normalizeNullableText(provenance.wikidataId) ||
    normalizeNullableText(provenance.osmId) ||
    normalizeNullableText(externalIds.wikidataId) ||
    normalizeNullableText(externalIds.osmId) ||
    normalizeNullableText(externalIds.providerHotelId)
  );
}

function hasVerifiedLocation(candidate) {
  return candidate?.lat !== null &&
    candidate?.lat !== undefined &&
    candidate?.lon !== null &&
    candidate?.lon !== undefined &&
    Number.isFinite(Number(candidate.lat)) &&
    Number.isFinite(Number(candidate.lon));
}

function withValidationFlags(candidate) {
  const normalizedCandidate = normalizeCandidateUrls(candidate);
  const flags = [];
  if (!hasUsableProvenance(normalizedCandidate)) flags.push('missing-provenance');
  if (!hasVerifiedLocation(normalizedCandidate)) flags.push('missing-location');
  if (normalizedCandidate.alreadyInCatalog) flags.push('already-in-catalog');
  if (!normalizedCandidate.hotelKey || !normalizedCandidate.name || !normalizedCandidate.city || !normalizedCandidate.country) {
    flags.push('missing-promotion-fields');
  }

  return {
    ...normalizedCandidate,
    duplicate: Boolean(normalizedCandidate.alreadyInCatalog),
    missingProvenance: !hasUsableProvenance(normalizedCandidate),
    missingLocation: !hasVerifiedLocation(normalizedCandidate),
    validationFlags: [...new Set([...(normalizedCandidate.validationFlags || []), ...flags])],
  };
}

export function getCandidateFingerprint(candidate) {
  const hotelKey = normalizeKey(candidate?.hotelKey);
  if (hotelKey) return `hotel-key:${hotelKey}`;

  return [
    'name-city-country',
    normalizeKey(candidate?.name),
    normalizeKey(candidate?.city),
    normalizeKey(candidate?.country || 'unknown'),
  ].join(':');
}

export function getCandidateId(candidate) {
  return hashId('catalog-candidate', getCandidateFingerprint(candidate));
}

export function normalizeCandidate(input, { status = 'pending', source, discoveredForCity } = {}) {
  const name = normalizeText(input?.name);
  const city = normalizeText(input?.city || discoveredForCity);
  const country = normalizeText(input?.country);
  const hotelKey = normalizeText(input?.hotelKey);
  const resolvedSource = normalizeText(input?.source || source || 'unknown');
  const sourceUrl = firstSafeSourceUrl(input?.sourceUrl, input?.url, input?.provenance?.sourceUrl, input?.provenance?.url);
  const externalIds = normalizeExternalIds(input);
  const normalizedStatus = VALID_STATUSES.has(input?.status) ? input.status : status;
  const duplicateFingerprint = getCandidateFingerprint({ ...input, name, city, country, hotelKey });
  const id = input?.id || getCandidateId({ ...input, name, city, country, hotelKey });
  const now = new Date().toISOString();

  const candidate = {
    id,
    hotelKey,
    name,
    city,
    country,
    stars: Number.isFinite(Number(input?.stars)) ? Number(input.stars) : null,
    lat: Number.isFinite(Number(input?.lat)) ? Number(input.lat) : null,
    lon: Number.isFinite(Number(input?.lon)) ? Number(input.lon) : null,
    source: resolvedSource,
    sourceUrl,
    externalIds,
    provenance: normalizeProvenance(input?.provenance, {
      source: resolvedSource,
      sourceUrl,
      externalIds,
      brand: input?.brand,
    }),
    validationStatus: input?.validationStatus || (hotelKey && name && city ? 'candidate' : 'incomplete'),
    priceValidation: input?.priceValidation || null,
    duplicateFingerprint,
    status: normalizedStatus,
    createdAt: input?.createdAt || now,
    updatedAt: now,
    reviewedAt: input?.reviewedAt || null,
    reviewedBy: input?.reviewedBy || null,
    rejectionReason: input?.rejectionReason || null,
    alreadyInCatalog: Boolean(hotelKey && findHotel(hotelKey)),
  };

  return withValidationFlags(candidate);
}

async function getIndex() {
  const index = await kv.get(INDEX_KEY);
  return Array.isArray(index) ? index : [];
}

async function saveIndex(ids) {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  await kv.setWithTTL(INDEX_KEY, uniqueIds, TTL_SECONDS);
}

export async function upsertCandidate(input, options = {}) {
  const candidate = normalizeCandidate(input, options);
  if (!candidate.name || !candidate.city) {
    return { candidate, saved: false, reason: 'Missing required candidate fields: name and city' };
  }

  const key = candidateKey(candidate.id);
  const existing = await kv.get(key);
  const lockedStatus = existing && ['approved', 'rejected'].includes(existing.status);
  const merged = existing
    ? {
        ...existing,
        ...candidate,
        status: lockedStatus ? existing.status : candidate.status,
        createdAt: existing.createdAt || candidate.createdAt,
        reviewedAt: existing.reviewedAt || candidate.reviewedAt,
        reviewedBy: existing.reviewedBy || candidate.reviewedBy,
        rejectionReason: existing.rejectionReason || candidate.rejectionReason,
        provenance: {
          ...(existing.provenance || {}),
          ...(candidate.provenance || {}),
          sources: [
            ...new Set([
              ...((existing.provenance && existing.provenance.sources) || []),
              existing.source,
              candidate.source,
            ].filter(Boolean)),
          ],
        },
      }
    : candidate;

  const normalized = withValidationFlags(merged);
  await kv.setWithTTL(key, normalized, TTL_SECONDS);
  const index = await getIndex();
  await saveIndex([normalized.id, ...index]);
  return { candidate: normalized, saved: true, existing: Boolean(existing) };
}

export async function upsertCandidates(candidates, options = {}) {
  let saved = 0;
  let skipped = 0;
  const ids = [];

  for (const candidate of candidates || []) {
    const result = await upsertCandidate(candidate, options);
    if (result.saved) {
      saved++;
      ids.push(result.candidate.id);
    } else {
      skipped++;
    }
  }

  return { saved, skipped, ids };
}

export async function getCandidate(id) {
  if (!id) return null;
  return await kv.get(candidateKey(id));
}

export async function listCandidates({ city, status, source, duplicate, missingProvenance, limit } = {}) {
  const ids = await getIndex();
  if (ids.length === 0) return [];
  const values = await kv.mget(ids.map(candidateKey));
  const seen = new Set();
  const candidates = values
    .filter(Boolean)
    .filter((candidate) => {
      if (seen.has(candidate.id)) return false;
      seen.add(candidate.id);
      return true;
    })
    .map((candidate) => withValidationFlags({
      ...candidate,
      alreadyInCatalog: Boolean(candidate.hotelKey && findHotel(candidate.hotelKey)),
    }));

  const statuses = status
    ? new Set(String(status).split(',').map((entry) => entry.trim()).filter(Boolean))
    : null;

  const filtered = candidates
    .filter((candidate) => !city || candidate.city.toLowerCase() === city.toLowerCase())
    .filter((candidate) => !statuses || statuses.has(candidate.status))
    .filter((candidate) => !source || candidate.source === source)
    .filter((candidate) => duplicate === undefined || candidate.duplicate === duplicate)
    .filter((candidate) => missingProvenance === undefined || candidate.missingProvenance === missingProvenance)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status.localeCompare(b.status);
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });

  const safeLimit = Number(limit);
  return Number.isFinite(safeLimit) && safeLimit > 0 ? filtered.slice(0, Math.min(safeLimit, 500)) : filtered;
}

function assertPromotable(candidate) {
  if (!candidate) return 'Candidate not found';
  if (candidate.status === 'rejected') return 'Rejected candidates cannot be approved';
  if (!candidate.hotelKey || !candidate.name || !candidate.city || !candidate.country) {
    return 'Candidate is missing required promotion fields: hotelKey, name, city, country';
  }
  if (!hasUsableProvenance(candidate)) {
    return 'Candidate is missing usable provenance';
  }
  if (!hasVerifiedLocation(candidate)) {
    return 'Candidate is missing verified latitude/longitude';
  }
  return null;
}

export async function approveCandidate(id, { actor = 'admin' } = {}) {
  const candidate = await getCandidate(id);
  const error = assertPromotable(candidate);
  if (error) return { approved: false, error, candidate };

  const added = await addAndPersistHotel({
    hotelKey: candidate.hotelKey,
    name: candidate.name,
    city: candidate.city,
    country: candidate.country,
    stars: candidate.stars || 0,
    lat: candidate.lat,
    lon: candidate.lon,
    source: candidate.source,
    sourceUrl: candidate.sourceUrl,
    externalIds: candidate.externalIds,
    provenance: candidate.provenance,
  });

  const updated = {
    ...candidate,
    status: 'approved',
    updatedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    reviewedBy: actor,
    alreadyInCatalog: true,
  };
  const normalized = withValidationFlags(updated);
  await kv.setWithTTL(candidateKey(candidate.id), normalized, TTL_SECONDS);
  return { approved: true, added, candidate: normalized };
}

export async function rejectCandidate(id, { actor = 'admin', reason = 'Rejected by admin review' } = {}) {
  const candidate = await getCandidate(id);
  if (!candidate) return { rejected: false, error: 'Candidate not found' };

  const updated = {
    ...candidate,
    status: 'rejected',
    updatedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    reviewedBy: actor,
    rejectionReason: normalizeText(reason),
  };
  const normalized = withValidationFlags(updated);
  await kv.setWithTTL(candidateKey(candidate.id), normalized, TTL_SECONDS);
  return { rejected: true, candidate: normalized };
}

export async function markCandidateStale(id, { actor = 'admin', reason = 'Marked stale by admin review' } = {}) {
  const candidate = await getCandidate(id);
  if (!candidate) return { stale: false, error: 'Candidate not found' };

  const updated = withValidationFlags({
    ...candidate,
    status: 'stale',
    updatedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    reviewedBy: actor,
    rejectionReason: normalizeText(reason),
  });
  await kv.setWithTTL(candidateKey(candidate.id), updated, TTL_SECONDS);
  return { stale: true, candidate: updated };
}
