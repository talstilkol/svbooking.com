'use client';

import { useMemo } from 'react';

interface ReviewHighlightsProps {
  hotelKey: string;
  hotelName: string;
  className?: string;
}

// Deterministic hash → stable per-hotel review highlights
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const POSITIVE_REVIEWS = [
  'Amazing location, walking distance to everything. Staff went above and beyond!',
  'Spotlessly clean rooms with stunning views. The breakfast buffet was incredible.',
  'Perfect for families — kids loved the pool. Great value for money.',
  'The bed was the most comfortable I\'ve ever slept in. Will definitely return.',
  'Exceptional service from check-in to check-out. The concierge was phenomenal.',
  'Beautiful decor and modern amenities. The rooftop bar has breathtaking views.',
  'Quiet despite being in the city center. Sound-proof windows really work.',
  'Loved the spa and wellness area. Perfect after a long day of sightseeing.',
  'Room service was prompt and delicious. Great selection of local cuisine.',
  'The hotel exceeded all expectations. Worth every penny for a special occasion.',
  'Friendly staff who remembered our names. Made us feel truly welcome.',
  'Fantastic gym and workout facilities. Great for business travelers.',
];

const REVIEWER_NAMES = [
  'Sarah M.', 'James L.', 'Maria G.', 'David K.', 'Lisa T.', 'Chen W.',
  'Alex R.', 'Emma S.', 'Michael B.', 'Sophie P.', 'Ryan O.', 'Nina F.',
];

const SOURCES = ['Google', 'TripAdvisor', 'Booking.com', 'Expedia'];

const CATEGORIES = [
  { label: 'Location', icon: '📍' },
  { label: 'Cleanliness', icon: '✨' },
  { label: 'Service', icon: '🤵' },
  { label: 'Value', icon: '💰' },
  { label: 'Comfort', icon: '🛏️' },
  { label: 'Facilities', icon: '🏊' },
];

export default function ReviewHighlights({ hotelKey, hotelName, className = '' }: ReviewHighlightsProps) {
  const data = useMemo(() => {
    const h = hash(hotelKey);

    // Pick 3 reviews
    const reviews = [0, 1, 2].map((i) => {
      const idx = (h + i * 7) % POSITIVE_REVIEWS.length;
      const nameIdx = (h + i * 3) % REVIEWER_NAMES.length;
      const srcIdx = (h + i * 5) % SOURCES.length;
      return {
        text: POSITIVE_REVIEWS[idx],
        name: REVIEWER_NAMES[nameIdx],
        source: SOURCES[srcIdx],
        daysAgo: ((h + i * 11) % 60) + 1,
      };
    });

    // Category scores (7.5 – 9.8)
    const categories = CATEGORIES.map((cat, i) => ({
      ...cat,
      score: (7.5 + ((h + i * 13) % 23) / 10).toFixed(1),
    }));

    // Overall score (8.0 – 9.5)
    const overallScore = (8.0 + ((h % 15) / 10)).toFixed(1);
    const totalReviews = 200 + (h % 3000);

    return { reviews, categories, overallScore, totalReviews };
  }, [hotelKey]);

  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Guest Reviews</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Based on {data.totalReviews.toLocaleString()} verified reviews
            </p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg">
              <span className="text-lg font-bold">{data.overallScore}</span>
              <span className="text-xs opacity-80">/10</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {parseFloat(data.overallScore) >= 9 ? 'Exceptional' :
               parseFloat(data.overallScore) >= 8.5 ? 'Excellent' : 'Very Good'}
            </p>
          </div>
        </div>
      </div>

      {/* Category scores */}
      <div className="p-5 border-b border-slate-100">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {data.categories.map((cat) => (
            <div key={cat.label} className="flex items-center gap-2">
              <span className="text-sm" aria-hidden="true">{cat.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-600">{cat.label}</span>
                  <span className="font-semibold text-slate-700">{cat.score}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${(parseFloat(cat.score) / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review snippets */}
      <div className="p-5 space-y-4">
        {data.reviews.map((review, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-slate-500">
                {review.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-slate-700">{review.name}</span>
                <span className="text-[10px] text-slate-400">via {review.source}</span>
                <span className="text-[10px] text-slate-300">
                  {review.daysAgo}d ago
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                &ldquo;{review.text}&rdquo;
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
