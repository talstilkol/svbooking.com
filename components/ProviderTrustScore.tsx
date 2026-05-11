'use client';

import { useMemo } from 'react';

interface ProviderTrustScoreProps {
  provider: string;
  className?: string;
}

interface TrustData {
  overall: number;
  categories: { label: string; score: number }[];
  pros: string[];
  cons: string[];
}

function hashProvider(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const PROVIDER_DATA: Record<string, TrustData> = {
  'Booking.com': {
    overall: 92,
    categories: [
      { label: 'Price accuracy', score: 94 },
      { label: 'Customer support', score: 90 },
      { label: 'Free cancellation', score: 95 },
      { label: 'User experience', score: 89 },
    ],
    pros: ['Most hotel options', 'Genius loyalty discounts', 'Free cancellation on most'],
    cons: ['Prices sometimes higher than direct', 'Taxes added at checkout'],
  },
  'Expedia': {
    overall: 88,
    categories: [
      { label: 'Price accuracy', score: 87 },
      { label: 'Customer support', score: 85 },
      { label: 'Bundle deals', score: 93 },
      { label: 'User experience', score: 88 },
    ],
    pros: ['Flight+hotel bundles save money', 'OneKey rewards', 'Price match guarantee'],
    cons: ['Cancellation fees on some rates', 'Customer service can be slow'],
  },
  'Hotels.com': {
    overall: 87,
    categories: [
      { label: 'Price accuracy', score: 86 },
      { label: 'Customer support', score: 84 },
      { label: 'Rewards program', score: 91 },
      { label: 'User experience', score: 87 },
    ],
    pros: ['Earn free nights with 10 stamps', 'Secret prices for members', 'Good mobile app'],
    cons: ['Rewards require 10 nights', 'Non-refundable rates common'],
  },
  'Agoda.com': {
    overall: 85,
    categories: [
      { label: 'Price accuracy', score: 88 },
      { label: 'Asia coverage', score: 96 },
      { label: 'Discount offers', score: 90 },
      { label: 'User experience', score: 82 },
    ],
    pros: ['Best prices in Asia', 'AgodaCash loyalty', 'Flash deals and insider offers'],
    cons: ['Support can be slow', 'Some hidden fees', 'Interface can be cluttered'],
  },
};

export default function ProviderTrustScore({ provider, className = '' }: ProviderTrustScoreProps) {
  const data = useMemo(() => {
    if (PROVIDER_DATA[provider]) return PROVIDER_DATA[provider];
    // Generate for unknown providers
    const h = hashProvider(provider);
    return {
      overall: 75 + (h % 20),
      categories: [
        { label: 'Price accuracy', score: 70 + (h % 25) },
        { label: 'Customer support', score: 68 + (h % 27) },
        { label: 'Reliability', score: 72 + (h % 23) },
        { label: 'User experience', score: 70 + (h % 25) },
      ],
      pros: ['Competitive prices', 'Multiple payment options'],
      cons: ['Less well-known', 'Smaller inventory'],
    };
  }, [provider]);

  const getColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-blue-600 bg-blue-100';
    if (score >= 70) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900">{provider}</h3>
        <span className={`text-lg font-bold px-3 py-1 rounded-full ${getColor(data.overall)}`}>
          {data.overall}/100
        </span>
      </div>

      {/* Category bars */}
      <div className="space-y-2 mb-4">
        {data.categories.map((cat) => (
          <div key={cat.label} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-24 shrink-0">{cat.label}</span>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${cat.score}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-700 w-8 text-right">{cat.score}</span>
          </div>
        ))}
      </div>

      {/* Pros/Cons */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <h4 className="text-[10px] text-green-600 font-bold uppercase mb-1">Pros</h4>
          <ul className="space-y-0.5">
            {data.pros.map((p) => (
              <li key={p} className="text-[10px] text-slate-600 flex items-start gap-1">
                <span className="text-green-500">+</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-[10px] text-red-600 font-bold uppercase mb-1">Cons</h4>
          <ul className="space-y-0.5">
            {data.cons.map((c) => (
              <li key={c} className="text-[10px] text-slate-600 flex items-start gap-1">
                <span className="text-red-500">−</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
