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
  // Added: all remaining catalog cities
  { city: 'Athens', country: 'Greece', lat: 37.9838, lng: 23.7275 },
  { city: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405 },
  { city: 'Brisbane', country: 'Australia', lat: -27.4698, lng: 153.0251 },
  { city: 'Budapest', country: 'Hungary', lat: 47.4979, lng: 19.0402 },
  { city: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
  { city: 'Colombo', country: 'Sri Lanka', lat: 6.9271, lng: 79.8612 },
  { city: 'Dresden', country: 'Germany', lat: 51.0504, lng: 13.7373 },
  { city: 'Granada', country: 'Spain', lat: 37.1773, lng: -3.5986 },
  { city: 'Helsinki', country: 'Finland', lat: 60.1699, lng: 24.9384 },
  { city: 'Jaipur', country: 'India', lat: 26.9124, lng: 75.7873 },
  { city: 'Jeddah', country: 'Saudi Arabia', lat: 21.4858, lng: 39.1925 },
  { city: 'Kuala Lumpur', country: 'Malaysia', lat: 3.139, lng: 101.6869 },
  { city: 'Lisbon', country: 'Portugal', lat: 38.7223, lng: -9.1393 },
  { city: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631 },
  { city: 'Munich', country: 'Germany', lat: 48.1351, lng: 11.582 },
  { city: 'Málaga', country: 'Spain', lat: 36.7213, lng: -4.4214 },
  { city: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219 },
  { city: 'New Delhi', country: 'India', lat: 28.6139, lng: 77.209 },
  { city: 'Perth', country: 'Australia', lat: -31.9505, lng: 115.8605 },
  { city: 'Porto', country: 'Portugal', lat: 41.1579, lng: -8.6291 },
  { city: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lng: 46.6753 },
  { city: 'Salvador', country: 'Brazil', lat: -12.9714, lng: -38.5124 },
  { city: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.978 },
  { city: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { city: 'Venice', country: 'Italy', lat: 45.4408, lng: 12.3155 },
  { city: 'Zagreb', country: 'Croatia', lat: 45.815, lng: 15.9819 },
];

export function getCityCoordinate(city: string): CityCoordinate | undefined {
  return CITY_COORDINATES.find(
    (c) => c.city.toLowerCase() === city.toLowerCase()
  );
}
