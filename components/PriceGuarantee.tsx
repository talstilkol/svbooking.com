export default function PriceGuarantee({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-emerald-50 border border-emerald-200 rounded-xl p-5 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
          <span className="text-2xl" aria-hidden="true">&#128170;</span>
        </div>
        <div>
          <h3 className="font-semibold text-emerald-900 mb-1">Best Price Guarantee</h3>
          <p className="text-sm text-emerald-700 leading-relaxed">
            We compare prices from 8+ major booking sites in real-time. If you find the same hotel
            cheaper elsewhere, our price comparison will show it. You always book directly with the
            provider offering the best rate — no middleman markups.
          </p>
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-emerald-600">
            <span className="flex items-center gap-1">
              <span aria-hidden="true">&#10003;</span> Real-time prices
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true">&#10003;</span> No hidden fees
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true">&#10003;</span> Book direct with provider
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true">&#10003;</span> Taxes included
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
