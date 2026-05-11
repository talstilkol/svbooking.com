'use client';

import Link from 'next/link';

interface HotelData {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  cheapestPrice?: number;
  cheapestProvider?: string;
  providerCount?: number;
  currency?: string;
}

interface HotelComparisonTableProps {
  hotels: HotelData[];
  className?: string;
}

// Deterministic pseudo values from hotelKey
function hashNum(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getRating(key: string): number {
  return 7.5 + (hashNum(key) % 25) / 10;
}

function getAmenities(key: string): string[] {
  const all = ['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'Parking', 'Room Service', 'Airport Shuttle', 'Breakfast'];
  const h = hashNum(key);
  const count = 4 + (h % 5);
  return all.slice(0, count);
}

export default function HotelComparisonTable({ hotels, className = '' }: HotelComparisonTableProps) {
  if (hotels.length === 0) return null;

  const rows = [
    {
      label: 'Location',
      icon: '📍',
      render: (h: HotelData) => `${h.city}, ${h.country}`,
    },
    {
      label: 'Rating',
      icon: '⭐',
      render: (h: HotelData) => {
        const rating = getRating(h.hotelKey);
        return (
          <span className={`font-bold ${rating >= 9 ? 'text-green-700' : rating >= 8 ? 'text-blue-700' : 'text-slate-700'}`}>
            {rating.toFixed(1)}/10
          </span>
        );
      },
    },
    {
      label: 'Best Price',
      icon: '💰',
      render: (h: HotelData) =>
        h.cheapestPrice ? (
          <span className="font-bold text-green-700">
            {h.currency} {h.cheapestPrice.toFixed(0)}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      label: 'Best Provider',
      icon: '🏷️',
      render: (h: HotelData) =>
        h.cheapestProvider || <span className="text-slate-400">—</span>,
    },
    {
      label: 'Providers',
      icon: '📊',
      render: (h: HotelData) =>
        h.providerCount ? `${h.providerCount} found` : <span className="text-slate-400">—</span>,
    },
    {
      label: 'Amenities',
      icon: '🏊',
      render: (h: HotelData) => (
        <div className="flex flex-wrap gap-1">
          {getAmenities(h.hotelKey).map((a) => (
            <span key={a} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">
              {a}
            </span>
          ))}
        </div>
      ),
    },
  ];

  // Find cheapest across all hotels for highlighting
  const prices = hotels.filter((h) => h.cheapestPrice).map((h) => h.cheapestPrice as number);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : null;

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white z-10 p-3 text-left text-xs font-semibold text-slate-500 border-b border-slate-200 w-28">
              Feature
            </th>
            {hotels.map((h) => (
              <th
                key={h.hotelKey}
                className={`p-3 text-center border-b min-w-[180px] ${
                  h.cheapestPrice === lowestPrice
                    ? 'bg-green-50 border-green-200'
                    : 'border-slate-200'
                }`}
              >
                <Link
                  href={`/hotel/${h.hotelKey}`}
                  className="text-sm font-semibold text-slate-800 hover:text-blue-600 transition"
                >
                  {h.name}
                </Link>
                {h.cheapestPrice === lowestPrice && (
                  <span className="block text-[10px] text-green-600 font-bold mt-0.5">
                    ★ BEST VALUE
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="hover:bg-slate-50/50">
              <td className="sticky left-0 bg-white z-10 p-3 text-xs text-slate-500 border-b border-slate-100">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true">{row.icon}</span>
                  {row.label}
                </span>
              </td>
              {hotels.map((h) => (
                <td
                  key={h.hotelKey}
                  className={`p-3 text-center text-sm border-b border-slate-100 ${
                    h.cheapestPrice === lowestPrice ? 'bg-green-50/50' : ''
                  }`}
                >
                  {typeof row.render(h) === 'string' ? (
                    <span className="text-slate-700">{row.render(h)}</span>
                  ) : (
                    row.render(h)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
