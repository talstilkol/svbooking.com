interface ProviderDataNoticeProps {
  provider: string;
  className?: string;
}

export default function ProviderDataNotice({ provider, className = '' }: ProviderDataNoticeProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900">{provider}</h3>
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
          Unscored
        </span>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">
        Verified provider-quality data is unavailable. Cancellation, support, and price-accuracy signals are not scored until sourced from verified records.
      </p>
    </div>
  );
}
