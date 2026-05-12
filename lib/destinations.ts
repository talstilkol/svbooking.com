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
      { code: 'IL', name: 'Israel',       nameHe: 'ישראל',               cities: ['Tel Aviv', 'Jerusalem'] },
      { code: 'AE', name: 'UAE',          nameHe: 'איחוד האמירויות',      cities: ['Dubai'] },
      { code: 'TR', name: 'Turkey',       nameHe: 'טורקיה',               cities: ['Istanbul'] },
      { code: 'EG', name: 'Egypt',        nameHe: 'מצרים',                cities: ['Cairo'] },
      { code: 'SA', name: 'Saudi Arabia', nameHe: 'ערב הסעודית',          cities: ['Riyadh', 'Jeddah'] },
    ],
  },
  {
    id: 'asia',
    name: 'Asia',
    nameHe: 'אסיה',
    emoji: '🏯',
    countries: [
      { code: 'TH', name: 'Thailand',   nameHe: 'תאילנד',     cities: ['Bangkok', 'Phuket'] },
      { code: 'JP', name: 'Japan',      nameHe: 'יפן',        cities: ['Tokyo'] },
      { code: 'SG', name: 'Singapore',  nameHe: 'סינגפור',    cities: ['Singapore'] },
      { code: 'ID', name: 'Indonesia',  nameHe: 'אינדונזיה',  cities: ['Bali'] },
      { code: 'KR', name: 'South Korea',nameHe: 'דרום קוריאה', cities: ['Seoul'] },
      { code: 'IN', name: 'India',      nameHe: 'הודו',       cities: ['New Delhi', 'Jaipur'] },
      { code: 'MY', name: 'Malaysia',   nameHe: 'מלזיה',      cities: ['Kuala Lumpur'] },
      { code: 'LK', name: 'Sri Lanka',  nameHe: 'סרי לנקה',   cities: ['Colombo'] },
    ],
  },
  {
    id: 'europe',
    name: 'Europe',
    nameHe: 'אירופה',
    emoji: '🏰',
    countries: [
      { code: 'FR', name: 'France',          nameHe: 'צרפת',       cities: ['Paris'] },
      { code: 'GB', name: 'United Kingdom',  nameHe: 'בריטניה',    cities: ['London'] },
      { code: 'IT', name: 'Italy',           nameHe: 'איטליה',     cities: ['Rome', 'Venice'] },
      { code: 'ES', name: 'Spain',           nameHe: 'ספרד',       cities: ['Barcelona', 'Granada', 'Málaga'] },
      { code: 'DE', name: 'Germany',         nameHe: 'גרמניה',     cities: ['Berlin', 'Munich', 'Dresden'] },
      { code: 'GR', name: 'Greece',          nameHe: 'יוון',       cities: ['Athens'] },
      { code: 'PT', name: 'Portugal',        nameHe: 'פורטוגל',    cities: ['Lisbon', 'Porto'] },
      { code: 'NL', name: 'Netherlands',     nameHe: 'הולנד',      cities: ['Amsterdam'] },
      { code: 'CZ', name: 'Czech Republic',  nameHe: 'צ׳כיה',      cities: ['Prague'] },
      { code: 'AT', name: 'Austria',         nameHe: 'אוסטריה',    cities: ['Vienna'] },
      { code: 'HU', name: 'Hungary',         nameHe: 'הונגריה',    cities: ['Budapest'] },
      { code: 'HR', name: 'Croatia',         nameHe: 'קרואטיה',    cities: ['Zagreb'] },
      { code: 'FI', name: 'Finland',         nameHe: 'פינלנד',     cities: ['Helsinki'] },
    ],
  },
  {
    id: 'americas',
    name: 'Americas',
    nameHe: 'אמריקה',
    emoji: '🗽',
    countries: [
      { code: 'US', name: 'USA',    nameHe: 'ארה"ב',   cities: ['New York', 'Miami', 'Las Vegas'] },
      { code: 'CA', name: 'Canada', nameHe: 'קנדה',    cities: ['Toronto'] },
      { code: 'BR', name: 'Brazil', nameHe: 'ברזיל',   cities: ['Salvador'] },
    ],
  },
  {
    id: 'africa',
    name: 'Africa',
    nameHe: 'אפריקה',
    emoji: '🌍',
    countries: [
      { code: 'KE', name: 'Kenya', nameHe: 'קניה', cities: ['Nairobi'] },
    ],
  },
  {
    id: 'oceania',
    name: 'Oceania',
    nameHe: 'אוקיאניה',
    emoji: '🦘',
    countries: [
      { code: 'AU', name: 'Australia', nameHe: 'אוסטרליה', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'] },
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
