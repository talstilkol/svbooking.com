// Trust-building row: shows OTA logos/names that we compare
export default function ProviderLogos({ className = '' }: { className?: string }) {
  const providers = [
    { name: 'Booking.com', color: 'text-blue-700', bg: 'bg-blue-50' },
    { name: 'Expedia', color: 'text-yellow-700', bg: 'bg-yellow-50' },
    { name: 'Hotels.com', color: 'text-red-700', bg: 'bg-red-50' },
    { name: 'Agoda', color: 'text-purple-700', bg: 'bg-purple-50' },
    { name: 'Vio.com', color: 'text-green-700', bg: 'bg-green-50' },
    { name: 'Trip.com', color: 'text-sky-700', bg: 'bg-sky-50' },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs text-slate-400 font-medium mr-1">Compare on:</span>
      {providers.map((p) => (
        <span
          key={p.name}
          className={`px-3 py-1 rounded-full text-xs font-semibold ${p.bg} ${p.color} border border-current/10`}
        >
          {p.name}
        </span>
      ))}
    </div>
  );
}
