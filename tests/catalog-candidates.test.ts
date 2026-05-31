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

import { addAndPersistHotel } from '@/lib/hotels-catalog';
import {
  approveCandidate,
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

  it('skips incomplete batch candidates and returns null for missing IDs', async () => {
    expect(await getCandidate('')).toBeNull();
    expect(await listCandidates()).toEqual([]);

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

  it('marks candidates stale and reports missing review targets without promotion', async () => {
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
