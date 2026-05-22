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
  getCandidateId,
  listCandidates,
  rejectCandidate,
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
});
