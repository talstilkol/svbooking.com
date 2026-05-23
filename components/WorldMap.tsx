'use client';

// Approximate x/y % positions on a rectangular world map (Mercator-ish)
const CITY_PINS: {
  city: string;
  country: string;
  x: number; // percent from left
  y: number; // percent from top
  emoji: string;
}[] = [
  // Europe
  { city: 'London',     country: 'United Kingdom', x: 47.5, y: 22,  emoji: '🏰' },
  { city: 'Edinburgh',  country: 'United Kingdom', x: 47,   y: 18,  emoji: '🏴' },
  { city: 'Paris',      country: 'France',       x: 49,   y: 24,   emoji: '🗼' },
  { city: 'Nice',       country: 'France',       x: 50,   y: 27,   emoji: '🌅' },
  { city: 'Lyon',       country: 'France',       x: 49.5, y: 25.5, emoji: '🍽' },
  { city: 'Cannes',     country: 'France',       x: 50.5, y: 27.5, emoji: '🎬' },
  { city: 'Amsterdam',  country: 'Netherlands',  x: 49.5, y: 21,   emoji: '🌷' },
  { city: 'Rome',       country: 'Italy',        x: 51,   y: 28,   emoji: '🏟' },
  { city: 'Florence',   country: 'Italy',        x: 50.5, y: 27,   emoji: '🎨' },
  { city: 'Milan',      country: 'Italy',        x: 50,   y: 25.5, emoji: '👗' },
  { city: 'Venice',     country: 'Italy',        x: 51.5, y: 26,   emoji: '🛶' },
  { city: 'Naples',     country: 'Italy',        x: 51.5, y: 29,   emoji: '🍕' },
  { city: 'Amalfi Coast',country: 'Italy',       x: 52,   y: 29.5, emoji: '🌊' },
  { city: 'Barcelona',  country: 'Spain',        x: 48,   y: 27,   emoji: '⛪' },
  { city: 'Madrid',     country: 'Spain',        x: 47,   y: 27.5, emoji: '🏛' },
  { city: 'Seville',    country: 'Spain',        x: 46,   y: 29,   emoji: '💃' },
  { city: 'Ibiza',      country: 'Spain',        x: 48.5, y: 29,   emoji: '🎶' },
  { city: 'Palma de Mallorca', country: 'Spain', x: 49,   y: 28.5, emoji: '🏝' },
  { city: 'Granada',    country: 'Spain',        x: 47,   y: 29.5, emoji: '🏰' },
  { city: 'Málaga',     country: 'Spain',        x: 46.5, y: 30,   emoji: '🌞' },
  { city: 'Prague',     country: 'Czech Republic', x: 51.5, y: 22.5, emoji: '🏯' },
  { city: 'Vienna',     country: 'Austria',      x: 52,   y: 23,   emoji: '🎼' },
  { city: 'Salzburg',   country: 'Austria',      x: 51,   y: 23,   emoji: '🎵' },
  { city: 'Berlin',     country: 'Germany',      x: 51,   y: 20.5, emoji: '🐻' },
  { city: 'Munich',     country: 'Germany',      x: 50.5, y: 23.5, emoji: '🍺' },
  { city: 'Hamburg',    country: 'Germany',      x: 50,   y: 19.5, emoji: '⚓' },
  { city: 'Frankfurt',  country: 'Germany',      x: 50,   y: 22,   emoji: '🏦' },
  { city: 'Dresden',    country: 'Germany',      x: 51.5, y: 21,   emoji: '🏛' },
  { city: 'Lisbon',     country: 'Portugal',     x: 45,   y: 28,   emoji: '🚋' },
  { city: 'Porto',      country: 'Portugal',     x: 45.5, y: 26.5, emoji: '🍷' },
  { city: 'Athens',     country: 'Greece',       x: 54,   y: 29,   emoji: '🏛' },
  { city: 'Santorini',  country: 'Greece',       x: 54.5, y: 30,   emoji: '🌅' },
  { city: 'Mykonos',    country: 'Greece',       x: 54.5, y: 29.5, emoji: '💙' },
  { city: 'Crete',      country: 'Greece',       x: 54,   y: 30.5, emoji: '🏖' },
  { city: 'Budapest',   country: 'Hungary',      x: 53,   y: 23.5, emoji: '♨️' },
  { city: 'Helsinki',   country: 'Finland',      x: 53,   y: 16,   emoji: '❄️' },
  { city: 'Zagreb',     country: 'Croatia',      x: 52.5, y: 25.5, emoji: '🏰' },
  { city: 'Dubrovnik',  country: 'Croatia',      x: 53,   y: 27,   emoji: '🌊' },
  { city: 'Split',      country: 'Croatia',      x: 52.5, y: 26.5, emoji: '🏛' },
  { city: 'Dublin',     country: 'Ireland',      x: 45.5, y: 20,   emoji: '☘️' },
  { city: 'Zurich',     country: 'Switzerland',  x: 50,   y: 23.5, emoji: '🏔' },
  { city: 'Geneva',     country: 'Switzerland',  x: 49.5, y: 24,   emoji: '⛲' },
  { city: 'Copenhagen', country: 'Denmark',      x: 51,   y: 18.5, emoji: '🧜' },
  { city: 'Stockholm',  country: 'Sweden',       x: 52,   y: 16.5, emoji: '👑' },
  { city: 'Oslo',       country: 'Norway',       x: 50.5, y: 16,   emoji: '🎿' },
  { city: 'Reykjavik',  country: 'Iceland',      x: 43,   y: 14,   emoji: '🌋' },
  { city: 'Krakow',     country: 'Poland',       x: 53,   y: 22,   emoji: '🐉' },
  { city: 'Warsaw',     country: 'Poland',       x: 53,   y: 20.5, emoji: '🏰' },
  { city: 'Brussels',   country: 'Belgium',      x: 49,   y: 22,   emoji: '🧇' },
  { city: 'Bruges',     country: 'Belgium',      x: 48.5, y: 21.5, emoji: '🌉' },
  { city: 'Tallinn',    country: 'Estonia',      x: 54,   y: 16.5, emoji: '🏰' },
  { city: 'Vilnius',    country: 'Lithuania',     x: 54,   y: 18.5, emoji: '⛪' },
  { city: 'Tbilisi',    country: 'Georgia',      x: 59,   y: 27,   emoji: '🍇' },
  { city: 'Batumi',     country: 'Georgia',      x: 58.5, y: 27.5, emoji: '🌊' },
  // Middle East
  { city: 'Istanbul',   country: 'Turkey',       x: 56,   y: 27,   emoji: '🕌' },
  { city: 'Dubai',      country: 'UAE',          x: 60,   y: 35,   emoji: '🏙' },
  { city: 'Abu Dhabi',  country: 'UAE',          x: 60,   y: 35.5, emoji: '🕌' },
  { city: 'Tel Aviv',   country: 'Israel',       x: 56.5, y: 30,   emoji: '🌊' },
  { city: 'Jerusalem',  country: 'Israel',       x: 57,   y: 31,   emoji: '⛩' },
  { city: 'Jeddah',     country: 'Saudi Arabia', x: 58,   y: 34,   emoji: '🕋' },
  { city: 'Riyadh',     country: 'Saudi Arabia', x: 59,   y: 33,   emoji: '🏜' },
  { city: 'Cairo',      country: 'Egypt',        x: 55,   y: 32,   emoji: '🔺' },
  { city: 'Doha',       country: 'Qatar',        x: 60.5, y: 34,   emoji: '🏟' },
  { city: 'Amman',      country: 'Jordan',       x: 57,   y: 30.5, emoji: '🏛' },
  { city: 'Muscat',     country: 'Oman',         x: 61,   y: 35,   emoji: '⛵' },
  { city: 'Manama',     country: 'Bahrain',      x: 60,   y: 34.5, emoji: '🌴' },
  { city: 'Kuwait City',country: 'Kuwait',       x: 59.5, y: 33,   emoji: '🏙' },
  // Asia
  { city: 'Bangkok',    country: 'Thailand',     x: 74,   y: 38,   emoji: '🏛' },
  { city: 'Phuket',     country: 'Thailand',     x: 74,   y: 42,   emoji: '🌴' },
  { city: 'Chiang Mai', country: 'Thailand',     x: 73.5, y: 36,   emoji: '🐘' },
  { city: 'Singapore',  country: 'Singapore',    x: 77,   y: 45,   emoji: '🦁' },
  { city: 'Bali',       country: 'Indonesia',    x: 79,   y: 49,   emoji: '🌺' },
  { city: 'Tokyo',      country: 'Japan',        x: 86,   y: 28,   emoji: '🗻' },
  { city: 'Kyoto',      country: 'Japan',        x: 85.5, y: 28.5, emoji: '⛩' },
  { city: 'Osaka',      country: 'Japan',        x: 85.5, y: 29,   emoji: '🏯' },
  { city: 'Seoul',      country: 'South Korea',  x: 84,   y: 28,   emoji: '🏯' },
  { city: 'Kuala Lumpur', country: 'Malaysia',   x: 76,   y: 44,   emoji: '🗼' },
  { city: 'Mumbai',     country: 'India',        x: 65,   y: 36,   emoji: '🏙' },
  { city: 'Jaipur',     country: 'India',        x: 66,   y: 34,   emoji: '🏰' },
  { city: 'New Delhi',  country: 'India',        x: 66,   y: 32,   emoji: '🕌' },
  { city: 'Udaipur',    country: 'India',        x: 65.5, y: 34.5, emoji: '🏰' },
  { city: 'Goa',        country: 'India',        x: 65,   y: 38,   emoji: '🏖' },
  { city: 'Colombo',    country: 'Sri Lanka',    x: 67,   y: 42,   emoji: '🌿' },
  { city: 'Hong Kong',  country: 'China',        x: 80,   y: 34,   emoji: '🌃' },
  { city: 'Shanghai',   country: 'China',        x: 82,   y: 30,   emoji: '🏙' },
  { city: 'Beijing',    country: 'China',        x: 80,   y: 27,   emoji: '🏯' },
  { city: 'Taipei',     country: 'Taiwan',       x: 82,   y: 33,   emoji: '🏙' },
  { city: 'Hanoi',      country: 'Vietnam',      x: 77,   y: 35,   emoji: '🏛' },
  { city: 'Ho Chi Minh City', country: 'Vietnam',x: 77,   y: 40,   emoji: '🏙' },
  { city: 'Maldives',   country: 'Maldives',     x: 65,   y: 44,   emoji: '🏝' },
  // Africa
  { city: 'Nairobi',    country: 'Kenya',        x: 57,   y: 45,   emoji: '🦁' },
  { city: 'Marrakech',  country: 'Morocco',      x: 46,   y: 31,   emoji: '🕌' },
  { city: 'Casablanca', country: 'Morocco',      x: 45.5, y: 31,   emoji: '🌊' },
  { city: 'Cape Town',  country: 'South Africa', x: 52,   y: 66,   emoji: '🏔' },
  { city: 'Johannesburg',country: 'South Africa',x: 55,   y: 62,   emoji: '💎' },
  { city: 'Zanzibar',   country: 'Tanzania',     x: 58,   y: 48,   emoji: '🌴' },
  { city: 'Dar es Salaam',country: 'Tanzania',   x: 57.5, y: 47,   emoji: '🌊' },
  { city: 'Mauritius',  country: 'Mauritius',     x: 62,   y: 58,   emoji: '🏝' },
  { city: 'Addis Ababa',country: 'Ethiopia',     x: 58,   y: 42,   emoji: '🏔' },
  { city: 'Lagos',      country: 'Nigeria',      x: 49,   y: 42,   emoji: '🏙' },
  { city: 'Accra',      country: 'Ghana',        x: 48,   y: 43,   emoji: '🌴' },
  // Americas
  { city: 'New York',   country: 'USA',          x: 27,   y: 26,   emoji: '🗽' },
  { city: 'Miami',      country: 'USA',          x: 26,   y: 32,   emoji: '🏖' },
  { city: 'Las Vegas',  country: 'USA',          x: 19,   y: 28,   emoji: '🎰' },
  { city: 'San Francisco', country: 'USA',       x: 17,   y: 27,   emoji: '🌉' },
  { city: 'Los Angeles',country: 'USA',          x: 18,   y: 29,   emoji: '🎬' },
  { city: 'Chicago',    country: 'USA',          x: 24,   y: 25,   emoji: '🏙' },
  { city: 'Washington DC', country: 'USA',       x: 26.5, y: 27,   emoji: '🏛' },
  { city: 'Boston',     country: 'USA',          x: 28,   y: 25,   emoji: '🏫' },
  { city: 'Seattle',    country: 'USA',          x: 18,   y: 23,   emoji: '☕' },
  { city: 'Nashville',  country: 'USA',          x: 25,   y: 28,   emoji: '🎸' },
  { city: 'Austin',     country: 'USA',          x: 22,   y: 30,   emoji: '🤠' },
  { city: 'San Diego',  country: 'USA',          x: 18.5, y: 30,   emoji: '🌴' },
  { city: 'Honolulu',   country: 'USA',          x: 8,    y: 35,   emoji: '🌺' },
  { city: 'Maui',       country: 'USA',          x: 7.5,  y: 35.5, emoji: '🏄' },
  { city: 'Scottsdale', country: 'USA',          x: 19.5, y: 29.5, emoji: '🌵' },
  { city: 'Toronto',    country: 'Canada',       x: 26,   y: 23,   emoji: '🍁' },
  { city: 'Montreal',   country: 'Canada',       x: 27.5, y: 22.5, emoji: '🎭' },
  { city: 'Vancouver',  country: 'Canada',       x: 17,   y: 22,   emoji: '🏔' },
  { city: 'Salvador',   country: 'Brazil',       x: 35,   y: 52,   emoji: '🎭' },
  { city: 'Rio de Janeiro', country: 'Brazil',   x: 34,   y: 56,   emoji: '🎉' },
  { city: 'Cancun',     country: 'Mexico',       x: 24,   y: 34,   emoji: '🏖' },
  { city: 'Mexico City',country: 'Mexico',       x: 22,   y: 35,   emoji: '🏛' },
  { city: 'Tulum',      country: 'Mexico',       x: 24.5, y: 35,   emoji: '🏝' },
  { city: 'Buenos Aires',country: 'Argentina',   x: 31,   y: 64,   emoji: '💃' },
  { city: 'Lima',       country: 'Peru',         x: 26,   y: 52,   emoji: '🏛' },
  { city: 'Cusco',      country: 'Peru',         x: 27,   y: 53,   emoji: '🏔' },
  { city: 'Machu Picchu', country: 'Peru',      x: 27,   y: 53.5, emoji: '🏛' },
  { city: 'Bogota',     country: 'Colombia',     x: 27,   y: 44,   emoji: '🏔' },
  { city: 'Cartagena',  country: 'Colombia',     x: 26,   y: 42,   emoji: '🏰' },
  { city: 'Medellín',   country: 'Colombia',     x: 26.5, y: 43,   emoji: '🌸' },
  { city: 'Santiago',   country: 'Chile',        x: 28,   y: 64,   emoji: '🏔' },
  // Oceania
  { city: 'Sydney',     country: 'Australia',    x: 87,   y: 65,   emoji: '🦘' },
  { city: 'Melbourne',  country: 'Australia',    x: 86,   y: 68,   emoji: '☕' },
  { city: 'Brisbane',   country: 'Australia',    x: 88,   y: 61,   emoji: '🌞' },
  { city: 'Perth',      country: 'Australia',    x: 80,   y: 66,   emoji: '🦢' },
  { city: 'Auckland',   country: 'New Zealand',  x: 92,   y: 66,   emoji: '⛵' },
  { city: 'Queenstown', country: 'New Zealand',  x: 91,   y: 70,   emoji: '🏔' },
  { city: 'Fiji',       country: 'Fiji',         x: 94,   y: 58,   emoji: '🏝' },
];

interface WorldMapProps {
  onCitySelect?: (city: string) => void;
  selectedCity?: string;
  className?: string;
}

export default function WorldMap({ onCitySelect, selectedCity, className = '' }: WorldMapProps) {
  return (
    <div className={`relative bg-linear-to-b from-sky-100 to-blue-100 rounded-2xl overflow-hidden border border-blue-200 ${className}`}>
      {/* Ocean background */}
      <div className="absolute inset-0 bg-linear-to-br from-blue-200/50 via-blue-100/30 to-sky-200/50" />

      {/* Simple continent shapes using CSS */}
      <svg
        viewBox="0 0 1000 500"
        className="absolute inset-0 w-full h-full opacity-20"
        aria-hidden="true"
      >
        {/* Europe */}
        <ellipse cx="500" cy="200" rx="70" ry="50" fill="#6b7280" />
        {/* Asia */}
        <ellipse cx="700" cy="220" rx="150" ry="80" fill="#6b7280" />
        {/* Africa */}
        <ellipse cx="510" cy="330" rx="60" ry="80" fill="#6b7280" />
        {/* Americas */}
        <ellipse cx="230" cy="270" rx="80" ry="120" fill="#6b7280" />
        {/* Australia */}
        <ellipse cx="860" cy="380" rx="55" ry="40" fill="#6b7280" />
      </svg>

      {/* City pins */}
      {CITY_PINS.map((pin) => {
        const isSelected = selectedCity === pin.city;
        return (
          <button
            key={pin.city}
            onClick={() => onCitySelect?.(pin.city)}
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 group z-10 transition-transform hover:scale-125 ${
              isSelected ? 'scale-150 z-20' : ''
            }`}
            aria-label={`${pin.city}, ${pin.country}`}
            title={`${pin.city}, ${pin.country}`}
          >
            <div className={`flex flex-col items-center ${isSelected ? 'drop-shadow-lg' : ''}`}>
              <span className="text-lg leading-none">{pin.emoji}</span>
              <span className={`text-[9px] font-semibold mt-0.5 px-1 rounded whitespace-nowrap ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/80 text-slate-700 group-hover:bg-blue-100'
              }`}>
                {pin.city}
              </span>
            </div>
          </button>
        );
      })}

      <div className="relative h-64 md:h-80" aria-label="Interactive world map with hotel destinations" role="img" />
      <p className="relative text-center text-xs text-blue-400 pb-2">
        Click a city to explore deals
      </p>
    </div>
  );
}
