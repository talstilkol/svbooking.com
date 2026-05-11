export default function HowItWorks() {
  const steps = [
    {
      number: '1',
      emoji: '🔍',
      title: 'Search',
      desc: 'Enter your destination or hotel name. Browse 63 hotels across 20 cities worldwide.',
    },
    {
      number: '2',
      emoji: '📊',
      title: 'Compare',
      desc: 'See real-time prices from Booking.com, Expedia, Hotels.com, Agoda & more side-by-side.',
    },
    {
      number: '3',
      emoji: '💰',
      title: 'Save',
      desc: 'Book directly with the cheapest provider. Find cheaper dates and set price alerts.',
    },
  ];

  return (
    <section className="bg-white border-y border-slate-100 py-16">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
          How it works
        </h2>
        <p className="text-center text-slate-500 mb-10">
          Find the best hotel deal in 3 simple steps
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center relative">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-3xl mx-auto mb-4">
                {step.emoji}
              </div>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-md">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">{step.title}</h3>
              <p className="text-slate-500 text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
