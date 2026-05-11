interface PricePerNightProps {
  total: number;
  currency: string;
  nights: number;
  className?: string;
}

export default function PricePerNight({ total, currency, nights, className = '' }: PricePerNightProps) {
  const perNight = nights > 0 ? total / nights : total;

  return (
    <div className={`text-center ${className}`}>
      <div className="text-2xl font-bold text-slate-900">
        {currency} {perNight.toFixed(0)}
      </div>
      <div className="text-xs text-slate-500">
        per night{nights > 1 ? ` × ${nights} nights` : ''}
      </div>
      {nights > 1 && (
        <div className="text-sm text-slate-600 mt-0.5">
          Total: {currency} {total.toFixed(2)}
        </div>
      )}
    </div>
  );
}
