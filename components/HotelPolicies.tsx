'use client';

interface HotelPoliciesProps {
  className?: string;
}

export default function HotelPolicies({ className = '' }: HotelPoliciesProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 ${className}`}>
      <h3 className="text-lg font-bold text-slate-900 mb-2">Hotel Policies</h3>
      <p className="text-sm text-slate-600 leading-relaxed">
        Verified property policy data is unavailable in SV Booking. Check-in times,
        cancellation terms, pet rules, age requirements, and payment policies should
        be confirmed on the selected booking provider before checkout.
      </p>
    </div>
  );
}
