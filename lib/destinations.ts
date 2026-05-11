export interface Country {
  code: string;
  name: string;
  nameHe?: string;
  cities: string[];
}

export interface Continent {
  id: string;
  name: string;
  nameHe?: string;
  emoji: string;
  countries: Country[];
}

export const CONTINENTS: Continent[] = [
  {
    id: 'middle-east',
    name: 'Middle East',
    nameHe: 'המזרח התיכון',
    emoji: '🏜️',
    countries: [
      { code: 'IL', name: 'Israel',  nameHe: 'ישראל',               cities: ['Tel Aviv', 'Jerusalem'] },
      { code: 'AE', name: 'UAE',     nameHe: 'איחוד האמירויות',      cities: ['Dubai'] },
      { code: 'TR', name: 'Turkey',  nameHe: 'טורקיה',               cities: ['Istanbul'] },
    ],
  },
  {
    id: 'asia',
    name: 'Asia',
    nameHe: 'אסיה',
    emoji: '🏯',
    countries: [
      { code: 'TH', name: 'Thailand',  nameHe: 'תאילנד',    cities: ['Bangkok', 'Phuket'] },
      { code: 'JP', name: 'Japan',     nameHe: 'יפן',       cities: ['Tokyo'] },
      { code: 'SG', name: 'Singapore', nameHe: 'סינגפור',   cities: ['Singapore'] },
      { code: 'ID', name: 'Indonesia', nameHe: 'אינדונזיה', cities: ['Bali'] },
    ],
  },
  {
    id: 'europe',
    name: 'Europe',
    nameHe: 'אירופה',
    emoji: '🏰',
    countries: [
      { code: 'FR', name: 'France',         nameHe: 'צרפת',        cities: ['Paris'] },
      { code: 'GB', name: 'UK',             nameHe: 'בריטניה',     cities: ['London'] },
      { code: 'IT', name: 'Italy',          nameHe: 'איטליה',      cities: ['Rome'] },
      { code: 'ES', name: 'Spain',          nameHe: 'ספרד',        cities: ['Barcelona'] },
      { code: 'NL', name: 'Netherlands',    nameHe: 'הולנד',       cities: ['Amsterdam'] },
      { code: 'CZ', name: 'Czech Republic', nameHe: 'צ׳כיה',       cities: ['Prague'] },
      { code: 'AT', name: 'Austria',        nameHe: 'אוסטריה',     cities: ['Vienna'] },
    ],
  },
  {
    id: 'americas',
    name: 'Americas',
    nameHe: 'אמריקה',
    emoji: '🗽',
    countries: [
      { code: 'US', name: 'USA', nameHe: 'ארה"ב', cities: ['New York', 'Miami', 'Las Vegas'] },
    ],
  },
  {
    id: 'oceania',
    name: 'Oceania',
    nameHe: 'אוקיאניה',
    emoji: '🦘',
    countries: [
      { code: 'AU', name: 'Australia', nameHe: 'אוסטרליה', cities: ['Sydney'] },
    ],
  },
];

export function getContinentById(id: string): Continent | undefined {
  return CONTINENTS.find((c) => c.id === id);
}

export function getCountriesByContinent(continentId: string): Country[] {
  return getContinentById(continentId)?.countries || [];
}

export function getCitiesByCountry(countryCode: string): string[] {
  for (const continent of CONTINENTS) {
    const country = continent.countries.find((c) => c.code === countryCode);
    if (country) return country.cities;
  }
  return [];
}

export function findContinentForCountry(countryName: string): Continent | undefined {
  return CONTINENTS.find((c) =>
    c.countries.some((co) => co.name.toLowerCase() === countryName.toLowerCase())
  );
}
