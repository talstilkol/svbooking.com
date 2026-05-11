'use client';

import { useState, useMemo } from 'react';

interface HotelPoliciesProps {
  hotelKey: string;
  className?: string;
}

function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function HotelPolicies({ hotelKey, className = '' }: HotelPoliciesProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const policies = useMemo(() => {
    const h = hashKey(hotelKey);
    const checkInHour = 14 + (h % 3); // 14, 15, or 16
    const checkOutHour = 10 + (h % 3); // 10, 11, or 12
    const freeCancelDays = [1, 2, 3, 7][h % 4];
    const allowsPets = h % 3 === 0;
    const smokingAllowed = h % 5 === 0;
    const minAge = [18, 21][h % 2];

    return [
      {
        id: 'checkin',
        icon: '🕐',
        title: 'Check-in / Check-out',
        summary: `Check-in from ${checkInHour}:00 · Check-out by ${checkOutHour}:00`,
        details: [
          `Check-in: ${checkInHour}:00 – 23:00`,
          `Check-out: by ${checkOutHour}:00`,
          'Early check-in subject to availability (may incur extra charge)',
          'Late check-out available upon request',
          'Express check-in/out available',
        ],
      },
      {
        id: 'cancel',
        icon: '❌',
        title: 'Cancellation Policy',
        summary: `Free cancellation up to ${freeCancelDays} day${freeCancelDays > 1 ? 's' : ''} before arrival`,
        details: [
          `Free cancellation up to ${freeCancelDays} day${freeCancelDays > 1 ? 's' : ''} before check-in`,
          `Cancellations within ${freeCancelDays} day${freeCancelDays > 1 ? 's' : ''}: first night charged`,
          'No-show: full stay charged',
          'Non-refundable rates available at discount',
          'Modifications subject to availability',
        ],
      },
      {
        id: 'children',
        icon: '👶',
        title: 'Children & Extra Beds',
        summary: 'Children welcome · Extra beds on request',
        details: [
          'Children of all ages are welcome',
          'Children under 6 stay free in existing beds',
          'Cribs available upon request (free)',
          'Extra bed: $25–$50/night depending on room type',
          'Maximum 1 extra bed per room',
        ],
      },
      {
        id: 'pets',
        icon: '🐾',
        title: 'Pet Policy',
        summary: allowsPets ? 'Pets allowed on request' : 'No pets allowed',
        details: allowsPets
          ? [
              'Pets allowed on request (charges may apply)',
              'Maximum 1 pet per room, up to 10kg',
              'Pet deposit: $50 (refundable)',
              'Pet-friendly rooms available',
              'Service animals always welcome',
            ]
          : [
              'Pets are not allowed at this property',
              'Service animals are welcome (documentation required)',
              'Nearby pet care facilities can be recommended',
            ],
      },
      {
        id: 'rules',
        icon: '📋',
        title: 'House Rules',
        summary: `${smokingAllowed ? 'Smoking areas available' : 'Non-smoking'} · Min age ${minAge}`,
        details: [
          smokingAllowed
            ? 'Smoking allowed in designated areas only'
            : 'Strictly non-smoking property',
          `Minimum guest age: ${minAge} years`,
          'Quiet hours: 22:00 – 07:00',
          'Valid government-issued ID required at check-in',
          'Parties and events not permitted',
          'Property reserves the right to pre-authorize credit cards',
        ],
      },
      {
        id: 'payment',
        icon: '💳',
        title: 'Payment Methods',
        summary: 'Visa, Mastercard, Amex & more',
        details: [
          'Visa, Mastercard, American Express accepted',
          'Debit cards accepted with pre-authorization hold',
          'Cash accepted at reception',
          'Pre-authorization may be placed on credit card',
          'Payment in local currency at hotel',
          'Online payment via booking providers',
        ],
      },
    ];
  }, [hotelKey]);

  return (
    <div className={className}>
      <h3 className="text-lg font-bold text-slate-900 mb-4">📋 Hotel Policies</h3>

      <div className="space-y-2">
        {policies.map((policy) => (
          <div
            key={policy.id}
            className="border border-slate-200 rounded-xl overflow-hidden bg-white"
          >
            <button
              onClick={() => setExpanded(expanded === policy.id ? null : policy.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition"
            >
              <span className="text-lg shrink-0">{policy.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900">{policy.title}</h4>
                <p className="text-xs text-slate-500 truncate">{policy.summary}</p>
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                  expanded === policy.id ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expanded === policy.id && (
              <div className="px-4 pb-4 pt-0">
                <ul className="space-y-1.5 ml-8">
                  {policy.details.map((detail, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="text-slate-300 mt-0.5">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
