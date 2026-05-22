interface RatingBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function RatingBadge({ size = 'md', className = '' }: RatingBadgeProps) {
  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded border border-slate-200">
          N/A
        </span>
        <span className="text-xs text-slate-500">Rating unavailable</span>
      </span>
    );
  }

  if (size === 'lg') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <span className="bg-slate-100 text-slate-600 text-lg font-bold w-14 h-14 rounded-xl flex items-center justify-center border border-slate-200">
          N/A
        </span>
        <div>
          <p className="font-semibold text-slate-800">Rating unavailable</p>
          <p className="text-sm text-slate-500">No verified review source connected</p>
        </div>
      </div>
    );
  }

  // md (default)
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded-lg text-sm border border-slate-200">
        N/A
      </span>
      <div>
        <p className="text-sm font-medium text-slate-700">Rating unavailable</p>
        <p className="text-xs text-slate-400">No verified review source connected</p>
      </div>
    </div>
  );
}
