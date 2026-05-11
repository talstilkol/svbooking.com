'use client';

import { useState } from 'react';

interface UserReviewFormProps {
  hotelKey: string;
  hotelName: string;
  onSubmit?: (review: UserReview) => void;
  className?: string;
}

interface UserReview {
  hotelKey: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  categories: Record<string, number>;
  timestamp: number;
}

const CATEGORIES = [
  { key: 'cleanliness', label: 'Cleanliness', icon: '🧹' },
  { key: 'location', label: 'Location', icon: '📍' },
  { key: 'service', label: 'Service', icon: '🛎️' },
  { key: 'value', label: 'Value', icon: '💰' },
  { key: 'comfort', label: 'Comfort', icon: '🛏️' },
];

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="text-2xl transition-transform hover:scale-110"
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          {star <= (hover || value) ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}

export default function UserReviewForm({
  hotelKey,
  hotelName,
  onSubmit,
  className = '',
}: UserReviewFormProps) {
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const updateCategory = (key: string, val: number) => {
    setCategories((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || rating === 0 || !title.trim()) return;

    const review: UserReview = {
      hotelKey,
      author: author.trim(),
      rating,
      title: title.trim(),
      body: body.trim(),
      categories,
      timestamp: Date.now(),
    };

    // Save to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('sv-user-reviews') || '[]');
      existing.push(review);
      localStorage.setItem('sv-user-reviews', JSON.stringify(existing));
    } catch {}

    onSubmit?.(review);
    setSubmitted(true);
  };

  if (!open) {
    return (
      <div className={className}>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
        >
          ✍️ Write a Review
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-2xl p-6 text-center ${className}`}>
        <span className="text-3xl block mb-2">🎉</span>
        <h3 className="text-lg font-bold text-green-800">Thank you for your review!</h3>
        <p className="text-sm text-green-600 mt-1">
          Your review of {hotelName} has been saved.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900">✍️ Review {hotelName}</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-slate-400 hover:text-slate-600 transition"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="John D."
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Overall Rating</label>
          <StarInput value={rating} onChange={setRating} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Category Ratings</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex items-center gap-2">
                <span className="text-sm">{cat.icon}</span>
                <span className="text-xs text-slate-600 w-16">{cat.label}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateCategory(cat.key, s)}
                      className={`w-5 h-5 rounded text-[10px] font-bold transition ${
                        s <= (categories[cat.key] || 0)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Review Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Great stay with amazing views"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Your Review</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your experience..."
            rows={4}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!author.trim() || rating === 0 || !title.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition"
          >
            Submit Review
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
