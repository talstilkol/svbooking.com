import { CITY_COORDINATES, type CityCoordinate } from '@/lib/city-coordinates';

export type MapHotel = {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  lat?: number | null;
  lon?: number | null;
};

export type MapMarker = {
  id: string;
  kind: 'hotel' | 'city';
  label: string;
  coord: CityCoordinate;
  hotels: MapHotel[];
  coordinateSource: 'property' | 'city-cluster';
};

export function hasExactLocation(hotel: MapHotel) {
  return hotel.lat !== null &&
    hotel.lat !== undefined &&
    hotel.lon !== null &&
    hotel.lon !== undefined &&
    Number.isFinite(Number(hotel.lat)) &&
    Number.isFinite(Number(hotel.lon));
}

export function buildMapMarkers(hotels: MapHotel[]): MapMarker[] {
  const markers: MapMarker[] = [];
  const cityMap = new Map<string, MapMarker>();

  for (const hotel of hotels) {
    if (hasExactLocation(hotel)) {
      markers.push({
        id: `hotel:${hotel.hotelKey}`,
        kind: 'hotel',
        label: hotel.name,
        coord: {
          city: hotel.city,
          country: hotel.country,
          lat: Number(hotel.lat),
          lng: Number(hotel.lon),
        },
        hotels: [hotel],
        coordinateSource: 'property',
      });
      continue;
    }

    const coord = CITY_COORDINATES.find(
      (candidate) => candidate.city.toLowerCase() === hotel.city.toLowerCase()
    );
    if (!coord) continue;
    const existing = cityMap.get(hotel.city);
    if (existing) {
      existing.hotels.push(hotel);
    } else {
      cityMap.set(hotel.city, {
        id: `city:${hotel.city}`,
        kind: 'city',
        label: hotel.city,
        coord,
        hotels: [hotel],
        coordinateSource: 'city-cluster',
      });
    }
  }

  return [...markers, ...cityMap.values()];
}
