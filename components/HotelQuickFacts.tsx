'use client';

interface HotelQuickFactsProps {
  hotelKey: string;
  hotelName: string;
  city: string;
  className?: string;
}

export default function HotelQuickFacts({
  hotelKey,
  hotelName,
  city,
  className = '',
}: HotelQuickFactsProps) {
  void hotelName; // accepted for future use (e.g., title heading)
  const facts = [
    { icon: '📍', label: 'City', value: city || 'Unavailable' },
    { icon: '🔑', label: 'Catalog key', value: hotelKey },
    { icon: '⭐', label: 'Category', value: 'Unavailable' },
    { icon: '🏨', label: 'Rooms', value: 'Unavailable' },
    { icon: '🏗️', label: 'Built', value: 'Unavailable' },
    { icon: '🔧', label: 'Renovated', value: 'Unavailable' },
    { icon: '📌', label: 'Distance data', value: 'Unavailable' },
    { icon: '🕐', label: 'Check-in/out', value: 'Provider site' },
    { icon: '🌐', label: 'Languages', value: 'Unavailable' },
  ];

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <h3 className="text-sm font-bold text-slate-900 mb-3">📋 Quick Facts — {hotelName}</h3>

      <div className="grid grid-cols-2 gap-2">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
          >
            <span className="text-sm">{fact.icon}</span>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500">{fact.label}</p>
              <p className="text-xs text-slate-700 font-medium truncate">{fact.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
