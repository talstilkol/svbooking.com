import { describe, expect, it } from 'vitest';
import { buildMapMarkers, hasExactLocation } from '@/lib/map-markers';

describe('map markers', () => {
  it('uses exact property coordinates only when verified lat/lon exists', () => {
    const [marker] = buildMapMarkers([{
      hotelKey: 'wikidata-q3145596-osm-1296703177',
      name: 'Le Meurice',
      city: 'Paris',
      country: 'France',
      lat: 48.865167,
      lon: 2.327972,
    }]);

    expect(marker).toMatchObject({
      id: 'hotel:wikidata-q3145596-osm-1296703177',
      kind: 'hotel',
      label: 'Le Meurice',
      coordinateSource: 'property',
      coord: {
        city: 'Paris',
        country: 'France',
        lat: 48.865167,
        lng: 2.327972,
      },
    });
    expect(hasExactLocation(marker.hotels[0])).toBe(true);
  });

  it('falls back to city clusters when property coordinates are unavailable', () => {
    const markers = buildMapMarkers([
      {
        hotelKey: 'g297930-d305178',
        name: 'Patong Beach Hotel',
        city: 'Phuket',
        country: 'Thailand',
      },
      {
        hotelKey: 'g297930-d300806',
        name: 'Anantara Layan Phuket',
        city: 'Phuket',
        country: 'Thailand',
      },
    ]);

    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({
      id: 'city:Phuket',
      kind: 'city',
      label: 'Phuket',
      coordinateSource: 'city-cluster',
      coord: {
        city: 'Phuket',
        country: 'Thailand',
        lat: 7.8804,
        lng: 98.3923,
      },
    });
    expect(markers[0].hotels.map((hotel) => hotel.name)).toEqual([
      'Patong Beach Hotel',
      'Anantara Layan Phuket',
    ]);
  });
});
