import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/kv', () => {
  const store = new Map<string, unknown>();
  return {
    __store: store,
    kv: {
      get: vi.fn(async (key: string) => store.get(key) || null),
      setWithTTL: vi.fn(async (key: string, value: unknown) => {
        store.set(key, value);
      }),
      mget: vi.fn(async (keys: string[]) => keys.map((key) => store.get(key) || null)),
      del: vi.fn(async (key: string) => {
        store.delete(key);
      }),
      keys: vi.fn(async () => []),
      isConfigured: vi.fn(async () => false),
    },
  };
});

vi.mock('@/lib/hotels-catalog', () => ({
  findHotel: vi.fn(() => null),
  addAndPersistHotel: vi.fn(async () => true),
}));

import { addAndPersistHotel, findHotel } from '@/lib/hotels-catalog';
import { kv } from '@/lib/kv';
import {
  approveCandidate,
  buildCandidateReviewSummary,
  getCandidate,
  getCandidateId,
  listCandidates,
  markCandidateStale,
  rejectCandidate,
  upsertCandidates,
  upsertCandidate,
} from '@/lib/catalog-candidates';

describe('catalog candidate queue', () => {
  beforeEach(async () => {
    const mod = await import('@/lib/kv') as Record<string, unknown>;
    (mod.__store as Map<string, unknown>).clear();
    vi.clearAllMocks();
  });

  it('generates deterministic IDs and deduplicates candidates', async () => {
    const input = {
      hotelKey: 'g1-d2',
      name: 'Verified Candidate',
      city: 'Paris',
      country: 'France',
      source: 'test-source',
      sourceUrl: 'https://www.wikidata.org/wiki/Q1',
      lat: 48.8566,
      lon: 2.3522,
    };

    expect(getCandidateId(input)).toBe(getCandidateId({ ...input, source: 'other-source' }));

    const first = await upsertCandidate(input);
    const second = await upsertCandidate({ ...input, source: 'second-source' });
    const candidates = await listCandidates();

    expect(first.saved).toBe(true);
    expect(second.saved).toBe(true);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].provenance.sources).toContain('test-source');
    expect(candidates[0].provenance.sources).toContain('second-source');
    expect(candidates[0].missingProvenance).toBe(false);
    expect(candidates[0].missingLocation).toBe(false);
  });

  it('normalizes fallback fingerprints, explicit status, direct external IDs, and brand provenance', async () => {
    expect(getCandidateId({ name: 'Hotel Sans Country', city: 'Paris' }))
      .toBe(getCandidateId({ name: '  hotel sans country  ', city: 'paris', country: '' }));

    const queued = await upsertCandidate({
      hotelKey: 'g1-d21',
      name: '  Candidate With Metadata  ',
      city: 'Paris',
      country: 'France',
      stars: '4',
      source: '',
      url: 'https://www.wikidata.org/wiki/Q21',
      wikidataId: 'Q21',
      osmId: 'relation/21',
      providerHotelId: 'provider-21',
      brand: 'Source Brand',
      lat: '48.8566',
      lon: '2.3522',
      status: 'approved',
    });

    expect(queued.candidate).toMatchObject({
      name: 'Candidate With Metadata',
      stars: 4,
      source: 'unknown',
      sourceUrl: 'https://www.wikidata.org/wiki/Q21',
      status: 'approved',
      validationStatus: 'candidate',
      externalIds: {
        wikidataId: 'Q21',
        osmId: 'relation/21',
        providerHotelId: 'provider-21',
      },
      provenance: expect.objectContaining({
        source: 'unknown',
        sourceUrl: 'https://www.wikidata.org/wiki/Q21',
        url: 'https://www.wikidata.org/wiki/Q21',
        brand: 'Source Brand',
      }),
    });
  });

  it('uses discovered city fallback, validates unknown statuses, and marks existing catalog duplicates', async () => {
    vi.mocked(findHotel).mockReturnValueOnce({
      hotelKey: 'g1-d20',
      name: 'Le Meurice',
      city: 'Paris',
      country: 'France',
    });

    const queued = await upsertCandidate({
      hotelKey: 'g1-d20',
      name: '  Le   Meurice  ',
      country: 'France',
      status: 'not-a-status',
      provenance: { url: 'https://www.wikidata.org/wiki/Q160937' },
      externalIds: { osmId: 'relation/1', providerHotelId: '188728' },
      lat: '48.865',
      lon: '2.328',
    }, {
      status: 'stale',
      source: 'wikidata',
      discoveredForCity: 'Paris',
    });

    expect(queued.saved).toBe(true);
    expect(queued.candidate).toMatchObject({
      name: 'Le Meurice',
      city: 'Paris',
      source: 'wikidata',
      status: 'stale',
      duplicate: true,
      missingProvenance: false,
      missingLocation: false,
      externalIds: {
        osmId: 'relation/1',
        providerHotelId: '188728',
      },
    });
  });

  it('requires complete fields before promotion to the catalog', async () => {
    const queued = await upsertCandidate({
      hotelKey: 'g1-d3',
      name: 'Incomplete Candidate',
      city: 'Paris',
      source: 'osm-scanner-agent',
    });

    const approved = await approveCandidate(queued.candidate.id, { actor: 'admin-api-secret' });

    expect(approved.approved).toBe(false);
    expect(approved.error).toContain('country');
    expect(addAndPersistHotel).not.toHaveBeenCalled();
  });

  it('requires usable provenance and verified coordinates before promotion', async () => {
    const noProvenance = await upsertCandidate({
      hotelKey: 'g1-d30',
      name: 'No Provenance Candidate',
      city: 'Paris',
      country: 'France',
      source: 'manual-admin',
      lat: 48.8566,
      lon: 2.3522,
    });

    const provenanceApproval = await approveCandidate(noProvenance.candidate.id, { actor: 'admin-api-secret' });
    expect(provenanceApproval.approved).toBe(false);
    expect(provenanceApproval.error).toContain('provenance');

    const noLocation = await upsertCandidate({
      hotelKey: 'g1-d31',
      name: 'No Location Candidate',
      city: 'Paris',
      country: 'France',
      source: 'manual-admin',
      sourceUrl: 'https://www.wikidata.org/wiki/Q31',
    });

    const locationApproval = await approveCandidate(noLocation.candidate.id, { actor: 'admin-api-secret' });
    expect(locationApproval.approved).toBe(false);
    expect(locationApproval.error).toContain('latitude/longitude');
    expect(addAndPersistHotel).not.toHaveBeenCalled();
  });

  it('does not treat unsafe source URLs as usable provenance', async () => {
    const queued = await upsertCandidate({
      hotelKey: 'g1-d32',
      name: 'Unsafe Source Candidate',
      city: 'Paris',
      country: 'France',
      source: 'manual-admin',
      sourceUrl: 'https://127.0.0.1/internal',
      provenance: { sourceUrl: 'https://[::ffff:127.0.0.1]/internal' },
      lat: 48.8566,
      lon: 2.3522,
    });

    expect(queued.candidate.sourceUrl).toBeNull();
    expect(queued.candidate.provenance.sourceUrl).toBeNull();
    expect(queued.candidate.provenance.url).toBeNull();
    expect(queued.candidate.missingProvenance).toBe(true);

    const approved = await approveCandidate(queued.candidate.id, { actor: 'admin-api-secret' });

    expect(approved.approved).toBe(false);
    expect(approved.error).toContain('provenance');
    expect(addAndPersistHotel).not.toHaveBeenCalled();
  });

  it('keeps external IDs as provenance while stripping unsafe source URLs', async () => {
    const queued = await upsertCandidate({
      hotelKey: 'g1-d33',
      name: 'External Id Candidate',
      city: 'Paris',
      country: 'France',
      source: 'manual-admin',
      sourceUrl: 'https://100.64.0.1/internal',
      lat: 48.8566,
      lon: 2.3522,
      externalIds: { wikidataId: 'Q33' },
    });

    expect(queued.candidate.sourceUrl).toBeNull();
    expect(queued.candidate.provenance.sourceUrl).toBeNull();
    expect(queued.candidate.missingProvenance).toBe(false);
  });

  it('normalizes nested external IDs without requiring duplicate top-level fields', async () => {
    const queued = await upsertCandidate({
      hotelKey: 'g1-d35',
      name: 'Nested External Id Candidate',
      city: 'Paris',
      country: 'France',
      source: 'manual-admin',
      lat: 48.8566,
      lon: 2.3522,
      externalIds: {
        wikidataId: 'Q35',
        osmId: 'node/35',
        providerHotelId: 'provider-35',
      },
    });

    expect(queued.candidate.externalIds).toEqual({
      wikidataId: 'Q35',
      osmId: 'node/35',
      providerHotelId: 'provider-35',
    });
    expect(queued.candidate.provenance).toMatchObject({
      wikidataId: 'Q35',
      osmId: 'node/35',
    });
    expect(queued.candidate.missingProvenance).toBe(false);
  });

  it('keeps the first safe source URL when another provenance URL is unsafe', async () => {
    const queued = await upsertCandidate({
      hotelKey: 'g1-d34',
      name: 'Mixed Provenance Candidate',
      city: 'Paris',
      country: 'France',
      source: 'manual-admin',
      sourceUrl: 'https://www.wikidata.org/wiki/Q34',
      provenance: { url: 'https://127.1/internal' },
      lat: 48.8566,
      lon: 2.3522,
    });

    expect(queued.candidate.sourceUrl).toBe('https://www.wikidata.org/wiki/Q34');
    expect(queued.candidate.provenance.sourceUrl).toBe('https://www.wikidata.org/wiki/Q34');
    expect(queued.candidate.missingProvenance).toBe(false);
  });

  it('approves and rejects candidates through explicit review states', async () => {
    const queued = await upsertCandidate({
      hotelKey: 'g1-d4',
      name: 'Complete Candidate',
      city: 'Paris',
      country: 'France',
      source: 'xotelo-discovery-agent',
      sourceUrl: 'https://www.wikidata.org/wiki/Q4',
      lat: 48.8566,
      lon: 2.3522,
      externalIds: { wikidataId: 'Q4' },
    });

    const approved = await approveCandidate(queued.candidate.id, { actor: 'admin-api-secret' });
    expect(approved.approved).toBe(true);
    expect(addAndPersistHotel).toHaveBeenCalledWith({
      hotelKey: 'g1-d4',
      name: 'Complete Candidate',
      city: 'Paris',
      country: 'France',
      stars: 0,
      lat: 48.8566,
      lon: 2.3522,
      source: 'xotelo-discovery-agent',
      sourceUrl: 'https://www.wikidata.org/wiki/Q4',
      externalIds: { wikidataId: 'Q4' },
      provenance: expect.objectContaining({
        source: 'xotelo-discovery-agent',
        sourceUrl: 'https://www.wikidata.org/wiki/Q4',
      }),
    });

    const rejectedQueued = await upsertCandidate({
      hotelKey: 'g1-d5',
      name: 'Rejected Candidate',
      city: 'Paris',
      country: 'France',
      source: 'manual-admin',
    });
    const rejected = await rejectCandidate(rejectedQueued.candidate.id, {
      actor: 'admin-api-secret',
      reason: 'duplicate',
    });

    expect(rejected.rejected).toBe(true);
    expect(rejected.candidate.status).toBe('rejected');
    expect(rejected.candidate.rejectionReason).toBe('duplicate');
  });

  it('keeps approved/rejected candidates locked when later discovery updates arrive', async () => {
    const approvedQueued = await upsertCandidate({
      hotelKey: 'g1-d61',
      name: 'Approved Candidate',
      city: 'Paris',
      country: 'France',
      source: 'wikidata',
      sourceUrl: 'https://www.wikidata.org/wiki/Q61',
      lat: 48.8566,
      lon: 2.3522,
    });
    await approveCandidate(approvedQueued.candidate.id, { actor: 'admin-api-secret' });

    const updatedApproved = await upsertCandidate({
      hotelKey: 'g1-d61',
      name: 'Approved Candidate',
      city: 'Paris',
      country: 'France',
      source: 'osm',
      status: 'pending',
      sourceUrl: 'https://www.openstreetmap.org/node/61',
      lat: 48.8567,
      lon: 2.3523,
    });

    expect(updatedApproved.candidate.status).toBe('approved');
    expect(updatedApproved.candidate.provenance.sources).toEqual(expect.arrayContaining(['wikidata', 'osm']));

    const rejectedQueued = await upsertCandidate({
      hotelKey: 'g1-d62',
      name: 'Rejected Candidate',
      city: 'Paris',
      country: 'France',
      source: 'wikidata',
      sourceUrl: 'https://www.wikidata.org/wiki/Q62',
      lat: 48.8566,
      lon: 2.3522,
    });
    await rejectCandidate(rejectedQueued.candidate.id, { actor: 'admin-api-secret', reason: 'duplicate' });
    const approvedRejected = await approveCandidate(rejectedQueued.candidate.id, { actor: 'admin-api-secret' });

    expect(approvedRejected).toMatchObject({
      approved: false,
      error: 'Rejected candidates cannot be approved',
    });
    expect(addAndPersistHotel).toHaveBeenCalledTimes(1);
  });

  it('skips incomplete batch candidates and returns null for missing IDs', async () => {
    expect(await getCandidate('')).toBeNull();
    expect(await listCandidates()).toEqual([]);

    await expect(upsertCandidates(undefined as unknown as Parameters<typeof upsertCandidates>[0]))
      .resolves.toEqual({ saved: 0, skipped: 0, ids: [] });

    const result = await upsertCandidates([
      { city: 'Paris', country: 'France' },
      {
        hotelKey: 'g1-d8',
        name: 'Batch Candidate',
        city: 'Paris',
        country: 'France',
        sourceUrl: 'https://www.wikidata.org/wiki/Q8',
        lat: 48.8566,
        lon: 2.3522,
      },
    ]);

    expect(result).toMatchObject({ saved: 1, skipped: 1 });
    expect(result.ids).toHaveLength(1);
    expect(await getCandidate(result.ids[0])).toEqual(expect.objectContaining({
      hotelKey: 'g1-d8',
      status: 'pending',
    }));
  });

  it('filters candidate lists by comma status, city, source, duplicate and provenance state', async () => {
    await upsertCandidate({
      hotelKey: 'g1-d81',
      name: 'Filtered Candidate A',
      city: 'Paris',
      country: 'France',
      source: 'osm-scanner-agent',
      sourceUrl: 'https://www.wikidata.org/wiki/Q81',
      lat: 48.8566,
      lon: 2.3522,
      status: 'pending',
    });
    await upsertCandidate({
      hotelKey: 'g1-d82',
      name: 'Filtered Candidate B',
      city: 'Paris',
      country: 'France',
      source: 'osm-scanner-agent',
      sourceUrl: 'https://www.wikidata.org/wiki/Q82',
      lat: 48.8567,
      lon: 2.3523,
      status: 'stale',
    });
    await upsertCandidate({
      hotelKey: 'g1-d83',
      name: 'Filtered Candidate C',
      city: 'London',
      country: 'United Kingdom',
      source: 'manual-admin',
      lat: 51.5072,
      lon: -0.1276,
      status: 'rejected',
    });

    const filtered = await listCandidates({
      city: 'paris',
      status: 'pending,stale',
      source: 'osm-scanner-agent',
      duplicate: false,
      missingProvenance: false,
      limit: 1,
    });
    const all = await listCandidates({ status: 'pending,stale,rejected' });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toMatchObject({
      city: 'Paris',
      source: 'osm-scanner-agent',
      missingProvenance: false,
      duplicate: false,
    });
    expect(all.map((candidate) => candidate.status)).toEqual(['pending', 'rejected', 'stale']);
  });

  it('builds a deterministic review summary for duplicate and provenance dashboards', async () => {
    vi.mocked(findHotel).mockImplementation((hotelKey) => (
      hotelKey === 'g1-d503'
        ? { hotelKey, name: 'Existing Candidate', city: 'Paris', country: 'France' }
        : null
    ));

    await upsertCandidate({
      hotelKey: 'g1-d500',
      name: 'Ready Candidate',
      city: 'Paris',
      country: 'France',
      source: 'wikidata',
      sourceUrl: 'https://www.wikidata.org/wiki/Q500',
      lat: 48.8566,
      lon: 2.3522,
    });
    await upsertCandidate({
      hotelKey: 'g1-d501',
      name: 'Missing Source Candidate',
      city: 'Paris',
      country: 'France',
      source: 'manual-admin',
      lat: 48.8567,
      lon: 2.3523,
    });
    await upsertCandidate({
      hotelKey: 'g1-d502',
      name: 'Missing Location Candidate',
      city: 'London',
      country: 'United Kingdom',
      source: 'osm-scanner-agent',
      sourceUrl: 'https://www.openstreetmap.org/node/502',
    });
    await upsertCandidate({
      hotelKey: 'g1-d503',
      name: 'Existing Candidate',
      city: 'Paris',
      country: 'France',
      source: 'wikidata',
      sourceUrl: 'https://www.wikidata.org/wiki/Q503',
      lat: 48.8568,
      lon: 2.3524,
    });

    const candidates = await listCandidates({ status: 'pending' });
    const summary = buildCandidateReviewSummary(candidates);

    expect(summary).toMatchObject({
      total: 4,
      pending: 4,
      duplicate: 1,
      missingProvenance: 1,
      missingLocation: 1,
      missingPromotionFields: 0,
      readyToApprove: 1,
      promotable: 1,
      blockedPending: 3,
      dataPolicy: 'catalog-candidate-records-only',
      reviewQueues: {
        readyToApprove: 1,
        duplicate: 1,
        missingProvenance: 1,
        missingLocation: 1,
      },
    });
    expect(summary.byCity).toEqual([
      { value: 'Paris', count: 3 },
      { value: 'London', count: 1 },
    ]);
    expect(summary.bySource).toEqual([
      { value: 'wikidata', count: 2 },
      { value: 'manual-admin', count: 1 },
      { value: 'osm-scanner-agent', count: 1 },
    ]);
    expect(summary.validationFlags).toEqual([
      { value: 'already-in-catalog', count: 1 },
      { value: 'missing-location', count: 1 },
      { value: 'missing-provenance', count: 1 },
    ]);
  });

  it('summarizes raw review edge states without inventing missing metadata', () => {
    expect(buildCandidateReviewSummary(null)).toMatchObject({
      total: 0,
      pending: 0,
      approved: 0,
      byStatus: [],
      bySource: [],
      byCity: [],
      dataPolicy: 'catalog-candidate-records-only',
    });

    const summary = buildCandidateReviewSummary([
      {
        id: 'raw-duplicate-fingerprint',
        hotelKey: 'g1-d701',
        name: 'Duplicate Fingerprint Candidate',
        city: 'Rome',
        country: 'Italy',
        status: 'pending',
        duplicate: true,
        source: '',
        provenance: { source: 'wikidata', sourceUrl: 'https://www.wikidata.org/wiki/Q701' },
        lat: 41.9028,
        lon: 12.4964,
        createdAt: '2026-05-31T08:00:00.000Z',
        updatedAt: '2026-05-31T08:00:00.000Z',
      },
      {
        id: 'raw-approved-incomplete',
        name: 'Approved Incomplete Candidate',
        discoveredForCity: 'Madrid',
        status: 'approved',
        provenance: null,
        updatedAt: '2026-05-31T10:00:00.000Z',
      },
      {
        id: 'raw-unknown-state',
        name: 'Unknown State Candidate',
        country: 'Spain',
        provenance: null,
      },
    ]);

    expect(summary).toMatchObject({
      total: 3,
      pending: 1,
      approved: 1,
      rejected: 0,
      stale: 0,
      duplicate: 1,
      missingProvenance: 2,
      missingLocation: 2,
      missingPromotionFields: 2,
      readyToApprove: 0,
      blockedPending: 1,
      oldestPendingAt: '2026-05-31T08:00:00.000Z',
      newestUpdatedAt: '2026-05-31T10:00:00.000Z',
    });
    expect(summary.byStatus).toEqual([
      { value: 'approved', count: 1 },
      { value: 'pending', count: 1 },
      { value: 'unknown', count: 1 },
    ]);
    expect(summary.bySource).toEqual([
      { value: 'unavailable', count: 2 },
      { value: 'wikidata', count: 1 },
    ]);
    expect(summary.byCity).toEqual([
      { value: 'Madrid', count: 1 },
      { value: 'Rome', count: 1 },
      { value: 'unavailable', count: 1 },
    ]);
    expect(summary.validationFlags).toEqual([
      { value: 'missing-location', count: 2 },
      { value: 'missing-promotion-fields', count: 2 },
      { value: 'missing-provenance', count: 2 },
      { value: 'duplicate-fingerprint', count: 1 },
    ]);
  });

  it('deduplicates repeated index entries and sorts equal-status candidates by updated timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T09:00:00.000Z'));
    const older = await upsertCandidate({
      hotelKey: 'g1-d91',
      name: 'Older Candidate',
      city: 'Paris',
      country: 'France',
      source: 'manual-admin',
      sourceUrl: 'https://www.wikidata.org/wiki/Q91',
      lat: 48.8566,
      lon: 2.3522,
    });
    vi.setSystemTime(new Date('2026-05-31T10:00:00.000Z'));
    const newer = await upsertCandidate({
      hotelKey: 'g1-d92',
      name: 'Newer Candidate',
      city: 'Paris',
      country: 'France',
      source: 'manual-admin',
      sourceUrl: 'https://www.wikidata.org/wiki/Q92',
      lat: 48.8566,
      lon: 2.3522,
    });
    vi.useRealTimers();

    await kv.setWithTTL('catalog:candidates:index', [
      older.candidate.id,
      older.candidate.id,
      newer.candidate.id,
    ], 3600);

    const candidates = await listCandidates({ status: 'pending' });

    expect(candidates.map((candidate) => candidate.id)).toEqual([
      newer.candidate.id,
      older.candidate.id,
    ]);
  });

  it('merges sparse stored candidates without losing provenance or stable sorting', async () => {
    const mod = await import('@/lib/kv') as Record<string, unknown>;
    const kvStore = mod.__store as Map<string, unknown>;
    const queued = await upsertCandidate({
      hotelKey: 'g1-d93',
      name: 'Sparse Stored Candidate',
      city: 'Paris',
      country: 'France',
      source: 'wikidata',
      sourceUrl: 'https://www.wikidata.org/wiki/Q93',
      lat: 48.8566,
      lon: 2.3522,
    });

    kvStore.set(`catalog:candidate:${queued.candidate.id}`, {
      ...queued.candidate,
      createdAt: '',
      updatedAt: '',
      provenance: null,
    });

    const merged = await upsertCandidate({
      hotelKey: 'g1-d93',
      name: 'Sparse Stored Candidate',
      city: 'Paris',
      country: 'France',
      source: 'osm',
      sourceUrl: 'https://www.openstreetmap.org/node/93',
      lat: 48.8567,
      lon: 2.3523,
    });

    const companion = await upsertCandidate({
      hotelKey: 'g1-d94',
      name: 'Companion Sparse Candidate',
      city: 'Paris',
      country: 'France',
      source: 'manual-admin',
      sourceUrl: 'https://www.wikidata.org/wiki/Q94',
      lat: 48.8566,
      lon: 2.3522,
    });
    kvStore.set(`catalog:candidate:${companion.candidate.id}`, {
      ...companion.candidate,
      updatedAt: '',
    });
    await kv.setWithTTL('catalog:candidates:index', [
      companion.candidate.id,
      merged.candidate.id,
    ], 3600);

    const listed = await listCandidates({ status: 'pending' });

    expect(merged.existing).toBe(true);
    expect(merged.candidate.createdAt).toBeTruthy();
    expect(merged.candidate.provenance.sources).toEqual(['wikidata', 'osm']);
    expect(listed.map((candidate) => candidate.id)).toEqual([
      merged.candidate.id,
      companion.candidate.id,
    ]);
  });

  it('normalizes malformed stored candidate provenance and external IDs during listing', async () => {
    const mod = await import('@/lib/kv') as Record<string, unknown>;
    const kvStore = mod.__store as Map<string, unknown>;
    const queued = await upsertCandidate({
      hotelKey: 'g1-d95',
      name: 'Malformed Stored Candidate',
      city: 'Paris',
      country: 'France',
      source: 'manual-admin',
      sourceUrl: 'https://www.wikidata.org/wiki/Q95',
      lat: 48.8566,
      lon: 2.3522,
    });

    kvStore.set(`catalog:candidate:${queued.candidate.id}`, {
      ...queued.candidate,
      sourceUrl: null,
      provenance: null,
      externalIds: null,
      updatedAt: undefined,
    });

    const listed = await listCandidates({ status: 'pending' });
    const candidate = listed.find((entry) => entry.id === queued.candidate.id);

    expect(candidate).toMatchObject({
      id: queued.candidate.id,
      missingProvenance: true,
      duplicate: false,
    });
  });

  it('rejects raw stored candidates that lack provenance without assuming nested metadata exists', async () => {
    const mod = await import('@/lib/kv') as Record<string, unknown>;
    const kvStore = mod.__store as Map<string, unknown>;
    const id = 'raw-no-provenance';
    kvStore.set(`catalog:candidate:${id}`, {
      id,
      hotelKey: 'g1-d96',
      name: 'Raw Stored Candidate',
      city: 'Paris',
      country: 'France',
      status: 'pending',
      source: 'manual-admin',
      sourceUrl: null,
      lat: 48.8566,
      lon: 2.3522,
    });

    await expect(approveCandidate(id, { actor: 'admin-api-secret' })).resolves.toMatchObject({
      approved: false,
      error: 'Candidate is missing usable provenance',
    });
  });

  it('keeps listing order stable when same-status stored candidates lack updated timestamps', async () => {
    const mod = await import('@/lib/kv') as Record<string, unknown>;
    const kvStore = mod.__store as Map<string, unknown>;
    kvStore.set('catalog:candidates:index', ['raw-sort-a', 'raw-sort-b']);
    kvStore.set('catalog:candidate:raw-sort-a', {
      id: 'raw-sort-a',
      hotelKey: 'g1-d97',
      name: 'Raw Sort A',
      city: 'Paris',
      country: 'France',
      status: 'pending',
      source: 'manual-admin',
      provenance: null,
      updatedAt: undefined,
    });
    kvStore.set('catalog:candidate:raw-sort-b', {
      id: 'raw-sort-b',
      hotelKey: 'g1-d98',
      name: 'Raw Sort B',
      city: 'Paris',
      country: 'France',
      status: 'pending',
      source: 'manual-admin',
      provenance: null,
      updatedAt: undefined,
    });

    const listed = await listCandidates({ status: 'pending' });

    expect(listed.map((candidate) => candidate.id)).toEqual(['raw-sort-a', 'raw-sort-b']);
  });

  it('marks candidates stale and reports missing review targets without promotion', async () => {
    expect(await approveCandidate('missing-id')).toEqual({
      approved: false,
      error: 'Candidate not found',
      candidate: null,
    });
    expect(await rejectCandidate('missing-id')).toEqual({
      rejected: false,
      error: 'Candidate not found',
    });
    expect(await markCandidateStale('missing-id')).toEqual({
      stale: false,
      error: 'Candidate not found',
    });

    const queued = await upsertCandidate({
      hotelKey: 'g1-d9',
      name: 'Stale Candidate',
      city: 'Paris',
      country: 'France',
      source: 'manual-admin',
      sourceUrl: 'https://www.wikidata.org/wiki/Q9',
      lat: 48.8566,
      lon: 2.3522,
    });

    const stale = await markCandidateStale(queued.candidate.id, {
      actor: 'admin-api-secret',
      reason: 'outdated source',
    });

    expect(stale.stale).toBe(true);
    expect(stale.candidate).toMatchObject({
      status: 'stale',
      reviewedBy: 'admin-api-secret',
      rejectionReason: 'outdated source',
    });
  });
});
