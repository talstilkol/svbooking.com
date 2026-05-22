import { describe, expect, it } from 'vitest';
import { buildDiscoveryCandidate } from '@/app/api/agents/auto/discovery/route';
import { buildOsmCandidate } from '@/app/api/agents/auto/osm-scanner/route';

describe('free-only discovery candidates', () => {
  it('builds promotable OSM/Wikidata/Xotelo candidates with provenance and coordinates', () => {
    const candidate = buildDiscoveryCandidate({
      fallbackCity: 'Paris',
      osmHotel: {
        name: 'Le Meurice',
        lat: 48.865167,
        lon: 2.327972,
        wikidataId: 'Q3145596',
        osmId: 1296703177,
        osmType: 'node',
        stars: 5,
        brand: 'Dorchester Collection',
      },
      resolved: {
        tripAdvisorId: '188732',
        cityTripAdvisorId: '187147',
        cityName: 'Paris',
      },
    });

    expect(candidate).toEqual(expect.objectContaining({
      hotelKey: 'g187147-d188732',
      city: 'Paris',
      country: 'France',
      lat: 48.865167,
      lon: 2.327972,
      sourceUrl: 'https://www.wikidata.org/wiki/Q3145596',
    }));
    expect(candidate?.externalIds).toEqual(expect.objectContaining({
      wikidataId: 'Q3145596',
      providerHotelId: '188732',
    }));
    expect(candidate?.provenance).toEqual(expect.objectContaining({
      source: 'osm-wikidata-xotelo-validated',
      validation: 'xotelo-rates',
    }));
  });

  it('builds OSM scanner candidates with country fallback and OSM source URL', () => {
    const candidate = buildOsmCandidate({
      city: 'Paris',
      cityGeoId: '187147',
      hotel: {
        name: 'Le Meurice',
        tripadvisorRef: 'd188732',
        lat: 48.865167,
        lon: 2.327972,
        osmId: 1296703177,
        osmType: 'node',
        stars: 5,
      },
      resolved: undefined,
    } as Parameters<typeof buildOsmCandidate>[0]);

    expect(candidate).toEqual(expect.objectContaining({
      hotelKey: 'g187147-d188732',
      city: 'Paris',
      country: 'France',
      lat: 48.865167,
      lon: 2.327972,
      source: 'osm-tripadvisor-ref',
      sourceUrl: 'https://www.openstreetmap.org/node/1296703177',
    }));
    expect(candidate?.provenance).toEqual(expect.objectContaining({
      osmId: 'node:1296703177',
      providerHotelId: '188732',
    }));
  });

  it('refuses candidates without a TripAdvisor hotel and city key pair', () => {
    expect(buildOsmCandidate({
      city: 'Paris',
      hotel: {
        name: 'Le Meurice',
        lat: 48.865167,
        lon: 2.327972,
      },
      cityGeoId: undefined,
      resolved: undefined,
    } as Parameters<typeof buildOsmCandidate>[0])).toBeNull();
  });
});
