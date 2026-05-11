export default function Testimonials() {
  const reviews = [
    {
      text: 'Saved $120 on my Paris hotel by comparing across providers. The cheaper dates feature found me an even better deal!',
      author: 'Sarah M.',
      location: 'New York',
      rating: 5,
    },
    {
      text: 'Finally a price comparison site that actually works. Found the same room $80 cheaper than booking directly.',
      author: 'David K.',
      location: 'London',
      rating: 5,
    },
    {
      text: 'Love the AI agents — they scanned deals for me and found a 30% price drop on my favorite Tokyo hotel.',
      author: 'Yuki T.',
      location: 'Singapore',
      rating: 5,
    },
  ];

  return (
    <section className="max-w-5xl mx-auto px-4 py-16">
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
        What travelers say
      </h2>
      <p className="text-center text-slate-500 mb-10">
        Real savings from real travelers
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reviews.map((review, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: review.rating }).map((_, j) => (
                <span key={j} className="text-amber-400 text-lg">★</span>
              ))}
            </div>
            <p className="text-slate-700 text-sm leading-relaxed mb-4">
              &ldquo;{review.text}&rdquo;
            </p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                {review.author.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{review.author}</p>
                <p className="text-xs text-slate-500">{review.location}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
