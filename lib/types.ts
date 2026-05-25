export interface CatalogHotel {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  image: string;
}

export interface ProviderRate {
  provider: string;
  code?: string;
  rate?: number;
  tax?: number;
  total: number;
  currency: string;
  source?: string | null;
  freshness?: string;
  partial?: boolean;
  deepLink?: string | null;
  taxesIncluded?: boolean | null;
  priceAccuracyState?: string;
  score?: number;
  scoreBasis?: string;
}
