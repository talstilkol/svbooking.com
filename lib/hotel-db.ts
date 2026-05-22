import { HOTELS } from './hotels-catalog';

export interface Hotel {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  image: string;
  rating?: number;
  stars?: number;
  amenities?: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface HotelSearchParams {
  city?: string;
  country?: string;
  query?: string;
  limit?: number;
  offset?: number;
}

/**
 * Hotel database layer using static catalog
 * In Phase 1.2, this will be replaced with Supabase integration
 */
export class HotelDatabase {
  private static instance: HotelDatabase;
  private hotels: Hotel[] = [];

  private constructor() {
    this.hotels = HOTELS.map((h) => ({
      ...h,
      coordinates: this.getCoordinates(h.city),
    }));
  }

  private getCoordinates(city: string): { lat: number; lng: number } {
    const coords: Record<string, { lat: number; lng: number }> = {
      'New York': { lat: 40.7128, lng: -74.006 },
      'Paris': { lat: 48.8566, lng: 2.3522 },
      'London': { lat: 51.5074, lng: -0.1278 },
      'Tokyo': { lat: 35.6762, lng: 139.6503 },
      'Dubai': { lat: 25.2048, lng: 55.2708 },
      'Tel Aviv': { lat: 32.0853, lng: 34.7818 },
      'Barcelona': { lat: 41.3851, lng: 2.1734 },
      'Rome': { lat: 41.9028, lng: 12.4964 },
      'Amsterdam': { lat: 52.3676, lng: 4.9041 },
      'Sydney': { lat: -33.8688, lng: 151.2093 },
      'Los Angeles': { lat: 34.0522, lng: -118.2437 },
      'Miami': { lat: 25.7617, lng: -80.1918 },
      'Singapore': { lat: 1.3521, lng: 103.8198 },
      'Hong Kong': { lat: 22.3193, lng: 114.1694 },
      'Bangkok': { lat: 13.7563, lng: 100.5018 },
      'Istanbul': { lat: 41.0082, lng: 28.9784 },
      'Berlin': { lat: 52.52, lng: 13.405 },
      'Madrid': { lat: 40.4168, lng: -3.7038 },
      'San Francisco': { lat: 37.7749, lng: -122.4194 },
      'Las Vegas': { lat: 36.1699, lng: -115.1398 },
    };
    return coords[city] || { lat: 0, lng: 0 };
  }

  static getInstance(): HotelDatabase {
    if (!HotelDatabase.instance) {
      HotelDatabase.instance = new HotelDatabase();
    }
    return HotelDatabase.instance;
  }

  async search(params: HotelSearchParams): Promise<Hotel[]> {
    let results = this.hotels;

    if (params.city) {
      results = results.filter((h) =>
        h.city.toLowerCase().includes(params.city!.toLowerCase())
      );
    }

    if (params.country) {
      results = results.filter((h) =>
        h.country.toLowerCase().includes(params.country!.toLowerCase())
      );
    }

    if (params.query) {
      const query = params.query.toLowerCase();
      results = results.filter(
        (h) =>
          h.name.toLowerCase().includes(query) ||
          h.city.toLowerCase().includes(query) ||
          h.country.toLowerCase().includes(query)
      );
    }

    if (params.limit) {
      const offset = params.offset || 0;
      results = results.slice(offset, offset + params.limit);
    }

    return results;
  }

  async getByKey(hotelKey: string): Promise<Hotel | null> {
    return (
      this.hotels.find((h) => h.hotelKey === hotelKey) || null
    );
  }

  async getAll(): Promise<Hotel[]> {
    return this.hotels;
  }

  async getCities(): Promise<string[]> {
    const cities = new Set(this.hotels.map((h) => h.city));
    return Array.from(cities).sort();
  }

  async getCountries(): Promise<string[]> {
    const countries = new Set(this.hotels.map((h) => h.country));
    return Array.from(countries).sort();
  }

  async count(): Promise<number> {
    return this.hotels.length;
  }
}

export const hotelDb = HotelDatabase.getInstance();
