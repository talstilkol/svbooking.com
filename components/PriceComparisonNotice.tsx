export default function PriceComparisonNotice({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-xl p-5 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
          <span className="text-2xl" aria-hidden="true">&#128269;</span>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 mb-1">Price Comparison Notice</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            SV Booking compares rates returned by available providers for the selected dates.
            Fees, taxes, cancellation terms, and room details can vary by provider and should
            be confirmed before checkout.
          </p>
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span aria-hidden="true">&#10003;</span> Provider-supplied rates
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true">&#10003;</span> Date-specific results
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true">&#10003;</span> Direct provider checkout
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true">&#10003;</span> Terms confirmed off-site
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
