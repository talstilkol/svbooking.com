import { useMemo } from 'react';

interface CityGuideProps {
  city: string;
  className?: string;
}

interface CityInfo {
  description: string;
  bestFor: string[];
  bestTime: string;
  language: string;
  currency: string;
  timezone: string;
  emergencyNumber: string;
  tipping: string;
  transport: string[];
}

const CITY_GUIDES: Record<string, CityInfo> = {
  'Tel Aviv': {
    description: 'A vibrant Mediterranean city known for its beaches, Bauhaus architecture, and thriving tech scene.',
    bestFor: ['Beach lovers', 'Foodies', 'Nightlife', 'Culture'],
    bestTime: 'Apr–Jun, Sep–Nov',
    language: 'Hebrew, English widely spoken',
    currency: 'ILS (₪)',
    timezone: 'UTC+2 (IST)',
    emergencyNumber: '100 / 101',
    tipping: '10-15% at restaurants',
    transport: ['Bus', 'Light Rail', 'Taxi (Gett)', 'E-scooters'],
  },
  'Paris': {
    description: 'The City of Light, world-famous for art, cuisine, fashion, and romantic ambiance.',
    bestFor: ['Culture', 'Romance', 'Food', 'Art', 'Shopping'],
    bestTime: 'Apr–Jun, Sep–Oct',
    language: 'French, English in tourist areas',
    currency: 'EUR (€)',
    timezone: 'UTC+1 (CET)',
    emergencyNumber: '112',
    tipping: 'Service included, round up optional',
    transport: ['Metro', 'RER', 'Bus', 'Vélib bikes'],
  },
  'London': {
    description: 'A global capital blending centuries of history with cutting-edge modernity.',
    bestFor: ['History', 'Theater', 'Shopping', 'Food', 'Museums'],
    bestTime: 'May–Sep',
    language: 'English',
    currency: 'GBP (£)',
    timezone: 'UTC+0 (GMT)',
    emergencyNumber: '999',
    tipping: '10-15% at restaurants',
    transport: ['Tube', 'Bus', 'Overground', 'Black cabs', 'Oyster Card'],
  },
  'Tokyo': {
    description: 'A dazzling blend of ultramodern technology and ancient traditions.',
    bestFor: ['Food', 'Technology', 'Culture', 'Shopping', 'Nature'],
    bestTime: 'Mar–May, Oct–Nov',
    language: 'Japanese, limited English',
    currency: 'JPY (¥)',
    timezone: 'UTC+9 (JST)',
    emergencyNumber: '110 (police) / 119 (ambulance)',
    tipping: 'Not expected, may be offensive',
    transport: ['JR trains', 'Metro', 'Bus', 'Suica/Pasmo card'],
  },
  'Dubai': {
    description: 'A gleaming desert metropolis of superlatives — tallest buildings, grandest malls, and luxury beyond imagination.',
    bestFor: ['Luxury', 'Shopping', 'Architecture', 'Beach', 'Desert'],
    bestTime: 'Nov–Mar',
    language: 'Arabic, English widely spoken',
    currency: 'AED (د.إ)',
    timezone: 'UTC+4 (GST)',
    emergencyNumber: '999',
    tipping: '10-15%, often included',
    transport: ['Metro', 'Taxi', 'Bus', 'Water taxi', 'Nol Card'],
  },
  'Bangkok': {
    description: 'A sensory overload of ornate temples, vibrant street food, and electric nightlife.',
    bestFor: ['Food', 'Temples', 'Nightlife', 'Shopping', 'Budget travel'],
    bestTime: 'Nov–Feb',
    language: 'Thai, English in tourist areas',
    currency: 'THB (฿)',
    timezone: 'UTC+7 (ICT)',
    emergencyNumber: '191',
    tipping: 'Not expected, appreciated in tourist areas',
    transport: ['BTS Skytrain', 'MRT', 'Tuk-tuks', 'River boats', 'Grab'],
  },
  'Bali': {
    description: 'An island paradise of rice terraces, ancient temples, and world-class surf.',
    bestFor: ['Surfing', 'Temples', 'Nature', 'Wellness', 'Budget'],
    bestTime: 'Apr–Oct',
    language: 'Balinese/Indonesian, English in tourist areas',
    currency: 'IDR (Rp)',
    timezone: 'UTC+8 (WITA)',
    emergencyNumber: '112',
    tipping: '5-10% at restaurants',
    transport: ['Scooter rental', 'Grab', 'Private driver', 'Taxi'],
  },
  'Barcelona': {
    description: 'A Mediterranean gem where Gothic quarters meet Gaudí masterpieces and golden beaches.',
    bestFor: ['Architecture', 'Beach', 'Food', 'Nightlife', 'Art'],
    bestTime: 'May–Jun, Sep–Oct',
    language: 'Spanish, Catalan, English in tourist areas',
    currency: 'EUR (€)',
    timezone: 'UTC+1 (CET)',
    emergencyNumber: '112',
    tipping: 'Round up, 5-10% at restaurants',
    transport: ['Metro', 'Bus', 'Tram', 'Bicing bikes', 'T-Casual card'],
  },
  'Rome': {
    description: 'The Eternal City — 2,700 years of history, art, and the best pasta you will ever taste.',
    bestFor: ['History', 'Food', 'Art', 'Architecture', 'Romance'],
    bestTime: 'Apr–Jun, Sep–Oct',
    language: 'Italian, English in tourist areas',
    currency: 'EUR (€)',
    timezone: 'UTC+1 (CET)',
    emergencyNumber: '112',
    tipping: 'Round up, 10% at restaurants',
    transport: ['Metro', 'Bus', 'Tram', 'Taxi'],
  },
  'New York': {
    description: 'The city that never sleeps — iconic skyline, world-class dining, Broadway, and endless energy.',
    bestFor: ['Culture', 'Food', 'Shopping', 'Nightlife', 'Theater'],
    bestTime: 'Apr–Jun, Sep–Nov',
    language: 'English, Spanish widely spoken',
    currency: 'USD ($)',
    timezone: 'UTC-5 (EST)',
    emergencyNumber: '911',
    tipping: '18-20% at restaurants, $1-2/drink at bars',
    transport: ['Subway', 'Bus', 'Taxi', 'Uber/Lyft', 'Citi Bike', 'OMNY card'],
  },
};

export default function CityGuide({ city, className = '' }: CityGuideProps) {
  const guide = useMemo(() => CITY_GUIDES[city], [city]);

  if (!guide) return null;

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <h3 className="text-lg font-bold text-slate-900 mb-2">📖 {city} City Guide</h3>
      <p className="text-sm text-slate-600 mb-4">{guide.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {guide.bestFor.map((tag) => (
          <span key={tag} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {tag}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: '📅', label: 'Best time', value: guide.bestTime },
          { icon: '🗣️', label: 'Language', value: guide.language },
          { icon: '💰', label: 'Currency', value: guide.currency },
          { icon: '🕐', label: 'Timezone', value: guide.timezone },
          { icon: '🚨', label: 'Emergency', value: guide.emergencyNumber },
          { icon: '💵', label: 'Tipping', value: guide.tipping },
        ].map((item) => (
          <div key={item.label} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
            <span className="text-sm shrink-0">{item.icon}</span>
            <div>
              <p className="text-[10px] text-slate-400">{item.label}</p>
              <p className="text-xs text-slate-700 font-medium">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-semibold text-slate-700 mb-2">🚌 Getting Around</h4>
        <div className="flex flex-wrap gap-1.5">
          {guide.transport.map((t) => (
            <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
