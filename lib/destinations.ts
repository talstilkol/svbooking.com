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
      { code: 'AE', name: 'UAE',          nameHe: 'איחוד האמירויות',      cities: ['Dubai', 'Abu Dhabi'] },
      { code: 'TR', name: 'Turkey',       nameHe: 'טורקיה',               cities: ['Istanbul'] },
      { code: 'EG', name: 'Egypt',        nameHe: 'מצרים',                cities: ['Cairo'] },
      { code: 'SA', name: 'Saudi Arabia', nameHe: 'ערב הסעודית',          cities: ['Riyadh', 'Jeddah'] },
      { code: 'QA', name: 'Qatar',        nameHe: 'קטאר',                 cities: ['Doha'] },
      { code: 'JO', name: 'Jordan',       nameHe: 'ירדן',                 cities: ['Amman'] },
      { code: 'OM', name: 'Oman',         nameHe: 'עומאן',                cities: ['Muscat'] },
      { code: 'BH', name: 'Bahrain',      nameHe: 'בחריין',               cities: ['Manama'] },
      { code: 'KW', name: 'Kuwait',       nameHe: 'כווית',                cities: ['Kuwait City'] },
    ],
  },
  {
    id: 'asia',
    name: 'Asia',
    nameHe: 'אסיה',
    emoji: '🏯',
    countries: [
      { code: 'TH', name: 'Thailand',    nameHe: 'תאילנד',      cities: ['Bangkok', 'Phuket', 'Chiang Mai'] },
      { code: 'JP', name: 'Japan',       nameHe: 'יפן',         cities: ['Tokyo', 'Kyoto', 'Osaka'] },
      { code: 'SG', name: 'Singapore',   nameHe: 'סינגפור',     cities: ['Singapore'] },
      { code: 'ID', name: 'Indonesia',   nameHe: 'אינדונזיה',   cities: ['Bali'] },
      { code: 'KR', name: 'South Korea', nameHe: 'דרום קוריאה',  cities: ['Seoul'] },
      { code: 'IN', name: 'India',       nameHe: 'הודו',        cities: ['New Delhi', 'Mumbai', 'Jaipur', 'Udaipur', 'Goa'] },
      { code: 'MY', name: 'Malaysia',    nameHe: 'מלזיה',       cities: ['Kuala Lumpur'] },
      { code: 'LK', name: 'Sri Lanka',   nameHe: 'סרי לנקה',    cities: ['Colombo'] },
      { code: 'CN', name: 'China',       nameHe: 'סין',         cities: ['Hong Kong', 'Shanghai', 'Beijing'] },
      { code: 'VN', name: 'Vietnam',     nameHe: 'וייטנאם',     cities: ['Hanoi', 'Ho Chi Minh City'] },
      { code: 'MV', name: 'Maldives',    nameHe: 'מלדיביים',    cities: ['Maldives'] },
      { code: 'TW', name: 'Taiwan',      nameHe: 'טייוואן',     cities: ['Taipei'] },
    ],
  },
  {
    id: 'europe',
    name: 'Europe',
    nameHe: 'אירופה',
    emoji: '🏰',
    countries: [
      { code: 'FR', name: 'France',          nameHe: 'צרפת',       cities: ['Paris', 'Nice', 'Lyon', 'Cannes'] },
      { code: 'GB', name: 'United Kingdom',  nameHe: 'בריטניה',    cities: ['London', 'Edinburgh'] },
      { code: 'IT', name: 'Italy',           nameHe: 'איטליה',     cities: ['Rome', 'Florence', 'Milan', 'Venice', 'Naples', 'Amalfi Coast'] },
      { code: 'ES', name: 'Spain',           nameHe: 'ספרד',       cities: ['Barcelona', 'Madrid', 'Seville', 'Granada', 'Ibiza', 'Palma de Mallorca'] },
      { code: 'DE', name: 'Germany',         nameHe: 'גרמניה',     cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Dresden'] },
      { code: 'GR', name: 'Greece',          nameHe: 'יוון',       cities: ['Athens', 'Santorini', 'Mykonos', 'Crete'] },
      { code: 'PT', name: 'Portugal',        nameHe: 'פורטוגל',    cities: ['Lisbon', 'Porto'] },
      { code: 'NL', name: 'Netherlands',     nameHe: 'הולנד',      cities: ['Amsterdam'] },
      { code: 'CZ', name: 'Czech Republic',  nameHe: 'צ׳כיה',      cities: ['Prague'] },
      { code: 'AT', name: 'Austria',         nameHe: 'אוסטריה',    cities: ['Vienna', 'Salzburg'] },
      { code: 'HU', name: 'Hungary',         nameHe: 'הונגריה',    cities: ['Budapest'] },
      { code: 'HR', name: 'Croatia',         nameHe: 'קרואטיה',    cities: ['Zagreb', 'Dubrovnik', 'Split'] },
      { code: 'FI', name: 'Finland',         nameHe: 'פינלנד',     cities: ['Helsinki'] },
      { code: 'IE', name: 'Ireland',         nameHe: 'אירלנד',     cities: ['Dublin'] },
      { code: 'CH', name: 'Switzerland',     nameHe: 'שוויץ',      cities: ['Zurich', 'Geneva'] },
      { code: 'DK', name: 'Denmark',         nameHe: 'דנמרק',      cities: ['Copenhagen'] },
      { code: 'SE', name: 'Sweden',          nameHe: 'שוודיה',     cities: ['Stockholm'] },
      { code: 'PL', name: 'Poland',          nameHe: 'פולין',      cities: ['Krakow', 'Warsaw'] },
      { code: 'BE', name: 'Belgium',         nameHe: 'בלגיה',      cities: ['Brussels', 'Bruges'] },
      { code: 'EE', name: 'Estonia',         nameHe: 'אסטוניה',    cities: ['Tallinn'] },
      { code: 'IS', name: 'Iceland',         nameHe: 'איסלנד',     cities: ['Reykjavik'] },
      { code: 'NO', name: 'Norway',          nameHe: 'נורבגיה',    cities: ['Oslo'] },
      { code: 'GE', name: 'Georgia',         nameHe: 'גאורגיה',    cities: ['Tbilisi', 'Batumi'] },
      { code: 'LT', name: 'Lithuania',       nameHe: 'ליטא',       cities: ['Vilnius'] },
    ],
  },
  {
    id: 'americas',
    name: 'Americas',
    nameHe: 'אמריקה',
    emoji: '🗽',
    countries: [
      { code: 'US', name: 'USA',       nameHe: 'ארה"ב',       cities: ['New York', 'Miami', 'Las Vegas', 'San Francisco', 'Los Angeles', 'Chicago', 'Washington DC', 'Boston', 'Seattle', 'Nashville', 'Austin', 'San Diego', 'Honolulu', 'Maui', 'Scottsdale'] },
      { code: 'CA', name: 'Canada',    nameHe: 'קנדה',        cities: ['Toronto', 'Montreal', 'Vancouver'] },
      { code: 'BR', name: 'Brazil',    nameHe: 'ברזיל',       cities: ['Salvador', 'Rio de Janeiro'] },
      { code: 'MX', name: 'Mexico',    nameHe: 'מקסיקו',      cities: ['Cancun', 'Mexico City', 'Tulum'] },
      { code: 'AR', name: 'Argentina', nameHe: 'ארגנטינה',    cities: ['Buenos Aires'] },
      { code: 'PE', name: 'Peru',      nameHe: 'פרו',         cities: ['Lima', 'Cusco', 'Machu Picchu'] },
      { code: 'CO', name: 'Colombia',  nameHe: 'קולומביה',    cities: ['Bogota', 'Cartagena', 'Medellín'] },
      { code: 'CL', name: 'Chile',     nameHe: 'צ׳ילה',       cities: ['Santiago'] },
    ],
  },
  {
    id: 'africa',
    name: 'Africa',
    nameHe: 'אפריקה',
    emoji: '🌍',
    countries: [
      { code: 'KE', name: 'Kenya',        nameHe: 'קניה',          cities: ['Nairobi'] },
      { code: 'MA', name: 'Morocco',      nameHe: 'מרוקו',         cities: ['Marrakech', 'Casablanca'] },
      { code: 'ZA', name: 'South Africa', nameHe: 'דרום אפריקה',   cities: ['Cape Town', 'Johannesburg'] },
      { code: 'TZ', name: 'Tanzania',     nameHe: 'טנזניה',        cities: ['Dar es Salaam', 'Zanzibar'] },
      { code: 'MU', name: 'Mauritius',    nameHe: 'מאוריציוס',     cities: ['Mauritius'] },
      { code: 'ET', name: 'Ethiopia',     nameHe: 'אתיופיה',       cities: ['Addis Ababa'] },
      { code: 'NG', name: 'Nigeria',      nameHe: 'ניגריה',        cities: ['Lagos'] },
      { code: 'GH', name: 'Ghana',        nameHe: 'גאנה',          cities: ['Accra'] },
    ],
  },
  {
    id: 'oceania',
    name: 'Oceania',
    nameHe: 'אוקיאניה',
    emoji: '🦘',
    countries: [
      { code: 'AU', name: 'Australia',    nameHe: 'אוסטרליה',      cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'] },
      { code: 'NZ', name: 'New Zealand',  nameHe: 'ניו זילנד',     cities: ['Auckland', 'Queenstown'] },
      { code: 'FJ', name: 'Fiji',         nameHe: 'פיג׳י',         cities: ['Fiji'] },
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
