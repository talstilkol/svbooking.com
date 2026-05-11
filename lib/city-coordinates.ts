// Approximate city center coordinates for map display
// Used for the interactive map view — no geocoding API needed

export interface CityCoordinate {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export const CITY_COORDINATES: CityCoordinate[] = [
  { city: 'Tel Aviv', country: 'Israel', lat: 32.0853, lng: 34.7818 },
  { city: 'Jerusalem', country: 'Israel', lat: 31.7683, lng: 35.2137 },
  { city: 'Phuket', country: 'Thailand', lat: 7.8804, lng: 98.3923 },
  { city: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018 },
  { city: 'Bali', country: 'Indonesia', lat: -8.3405, lng: 115.092 },
  { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { city: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { city: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
  { city: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 },
  { city: 'Barcelona', country: 'Spain', lat: 41.3874, lng: 2.1686 },
  { city: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  { city: 'Prague', country: 'Czech Republic', lat: 50.0755, lng: 14.4378 },
  { city: 'Vienna', country: 'Austria', lat: 48.2082, lng: 16.3738 },
  { city: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784 },
  { city: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
  { city: 'New York', country: 'USA', lat: 40.7128, lng: -74.006 },
  { city: 'Miami', country: 'USA', lat: 25.7617, lng: -80.1918 },
  { city: 'Las Vegas', country: 'USA', lat: 36.1699, lng: -115.1398 },
  { city: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
];

export function getCityCoordinate(city: string): CityCoordinate | undefined {
  return CITY_COORDINATES.find(
    (c) => c.city.toLowerCase() === city.toLowerCase()
  );
}
