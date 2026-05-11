const REASONS = [
  {
    icon: '🔎',
    title: 'Compare 8+ providers',
    desc: 'One search shows prices from Booking.com, Expedia, Hotels.com, Agoda, Vio.com, Trip.com, and more — all side by side.',
    color: 'bg-blue-50 border-blue-100',
  },
  {
    icon: '📅',
    title: 'Find cheaper dates',
    desc: 'Our Cheaper Dates tool analyzes price trends and suggests when to travel for the biggest savings — up to 40% off.',
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
    desc: 'See 30-day price history to know if today is a good time to book or if you should wait for a better deal.',
    color: 'bg-amber-50 border-amber-100',
  },
  {
    icon: '🔒',
    title: 'No sign-up required',
    desc: 'Start comparing prices instantly. Your favorites and trips are saved locally — we never collect personal data.',
    color: 'bg-slate-50 border-slate-100',
  },
  {
    icon: '🌍',
    title: '20 cities worldwide',
    desc: 'From Paris to Tokyo, Dubai to New York — find the best hotel deals in the most popular destinations.',
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
          Everything you need to find the perfect hotel at the best price
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
