interface ComparisonMetaProps {
  providerCount: number;
  checkIn: string;
  checkOut: string;
  currency: string;
  className?: string;
}

export default function ComparisonMeta({
  providerCount,
  checkIn,
  checkOut,
  currency,
  className = '',
}: ComparisonMetaProps) {
  const nights = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 ${className}`}>
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden="true" />
        {providerCount} provider-returned rate{providerCount !== 1 ? 's' : ''}
      </span>
      <span>
        {nights} night{nights !== 1 ? 's' : ''}
      </span>
      <span>{currency}</span>
      <span>
        {new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        {' → '}
        {new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </span>
    </div>
  );
}
