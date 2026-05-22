'use client';

interface UrgencyBadgeProps {
  providerCount: number;
}

export default function UrgencyBadge({ providerCount }: UrgencyBadgeProps) {
  if (providerCount <= 0) return null;

  const lowCoverage = providerCount <= 2;
  const text = `${providerCount} provider${providerCount === 1 ? '' : 's'} returned prices`;

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border ${
      lowCoverage
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-blue-50 text-blue-700 border-blue-200'
    }`}>
      <span>{lowCoverage ? 'Low provider response count' : 'Provider response count'}</span>
      <span className="font-semibold">{text}</span>
    </div>
  );
}
