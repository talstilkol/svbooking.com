interface StarRatingProps {
  rating: number; // 0–5
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

export default function StarRating({
  rating,
  maxStars = 5,
  size = 'md',
  showValue = false,
  className = '',
}: StarRatingProps) {
  const clampedRating = Math.min(maxStars, Math.max(0, rating));
  const full = Math.floor(clampedRating);
  const half = clampedRating - full >= 0.5 ? 1 : 0;
  const empty = maxStars - full - half;

  const sizeClass = {
    sm: 'text-xs gap-0.5',
    md: 'text-sm gap-0.5',
    lg: 'text-lg gap-1',
  }[size];

  return (
    <div
      className={`inline-flex items-center ${sizeClass} ${className}`}
      role="img"
      aria-label={`${clampedRating.toFixed(1)} out of ${maxStars} stars`}
    >
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f${i}`} className="text-amber-400" aria-hidden="true">
          ★
        </span>
      ))}
      {half === 1 && (
        <span className="text-amber-400 relative" aria-hidden="true">
          <span className="absolute inset-0 overflow-hidden w-1/2">★</span>
          <span className="text-slate-200">★</span>
        </span>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} className="text-slate-200" aria-hidden="true">
          ★
        </span>
      ))}
      {showValue && (
        <span className="text-slate-500 font-medium ml-1">
          {clampedRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
