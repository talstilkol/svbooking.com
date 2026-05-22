import { CATALOG_STATS } from '@/lib/catalog-stats';

const BADGES = [
  { icon: '🔒', label: 'Secure & Private', desc: 'No sign-up required' },
  { icon: '💯', label: 'Free To Browse', desc: 'No SV Booking fee' },
  { icon: '⚡', label: 'Provider Rates', desc: 'When providers return data' },
  { icon: '🌍', label: `${CATALOG_STATS.cities} Cities`, desc: `${CATALOG_STATS.hotels} catalog hotels` },
];

export default function TrustBadges({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap justify-center gap-6 ${className}`}>
      {BADGES.map((badge) => (
        <div key={badge.label} className="flex items-center gap-2 text-sm">
          <span className="text-lg" aria-hidden="true">{badge.icon}</span>
          <div>
            <div className="font-semibold text-slate-700">{badge.label}</div>
            <div className="text-xs text-slate-500">{badge.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
