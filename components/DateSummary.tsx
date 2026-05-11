interface DateSummaryProps {
  checkIn: string;
  checkOut: string;
  className?: string;
}

export default function DateSummary({ checkIn, checkOut, className = '' }: DateSummaryProps) {
  if (!checkIn || !checkOut) return null;

  const ciDate = new Date(checkIn);
  const coDate = new Date(checkOut);
  const nights = Math.round((coDate.getTime() - ciDate.getTime()) / (1000 * 60 * 60 * 24));

  if (nights <= 0) return null;

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span className="text-slate-600">{formatDate(ciDate)}</span>
      <span className="text-slate-300">&rarr;</span>
      <span className="text-slate-600">{formatDate(coDate)}</span>
      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
        {nights} night{nights !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
