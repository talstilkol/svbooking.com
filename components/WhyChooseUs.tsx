import { CATALOG_STATS } from '@/lib/catalog-stats';

const REASONS = [
  {
    icon: '🔎',
    title: 'Compare available providers',
    desc: 'One search shows provider-returned prices side by side when configured sources respond.',
    color: 'bg-blue-50 border-blue-100',
  },
  {
    icon: '📅',
    title: 'Find cheaper dates',
    desc: 'The Cheaper Dates tool compares available provider prices across nearby dates and reports savings only when provider data supports it.',
    color: 'bg-emerald-50 border-emerald-100',
  },
  {
    icon: '🤖',
    title: 'AI-powered agents',
    desc: 'Automated deal scanners, health monitors, and personalized recommendations work in the background for you.',
    color: 'bg-purple-50 border-purple-100',
  },
  {
    icon: '📊',
    title: 'Price trend charts',
    desc: 'See price-history charts when verified provider observations are available; otherwise the app marks history as unavailable.',
    color: 'bg-amber-50 border-amber-100',
  },
  {
    icon: '🔒',
    title: 'No sign-up required',
    desc: 'Start comparing prices instantly. Favorites and trips are saved locally in your browser unless account features are enabled.',
    color: 'bg-slate-50 border-slate-100',
  },
  {
    icon: '🌍',
    title: `${CATALOG_STATS.cities} cities worldwide`,
    desc: 'From Paris to Tokyo, Dubai to New York — compare catalog hotels across the supported city list.',
    color: 'bg-sky-50 border-sky-100',
  },
];

export default function WhyChooseUs() {
  return (
    <section className="bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
          Why travelers choose SV Booking
        </h2>
        <p className="text-center text-slate-500 mb-10 max-w-2xl mx-auto">
          Tools for comparing hotels with available provider data
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REASONS.map((reason) => (
            <div
              key={reason.title}
              className={`p-6 rounded-xl border ${reason.color} transition-shadow hover:shadow-md`}
            >
              <div className="text-3xl mb-3" aria-hidden="true">{reason.icon}</div>
              <h3 className="font-semibold text-slate-800 mb-2">{reason.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{reason.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
