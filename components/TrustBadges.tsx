const BADGES = [
  { icon: '🔒', label: 'Secure & Private', desc: 'No sign-up required' },
  { icon: '💯', label: '100% Free', desc: 'No hidden fees' },
  { icon: '⚡', label: 'Real-Time Prices', desc: 'Live from 8+ providers' },
  { icon: '🌍', label: '20 Cities', desc: '63 hotels worldwide' },
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
