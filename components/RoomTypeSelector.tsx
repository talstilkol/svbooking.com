'use client';

interface RoomTypeSelectorProps {
  className?: string;
}

export default function RoomTypeSelector({ className = '' }: RoomTypeSelectorProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 ${className}`}>
      <h3 className="text-lg font-bold text-slate-900 mb-2">Room Types</h3>
      <p className="text-sm text-slate-600 leading-relaxed">
        Verified room categories, occupancy limits, room-level amenities, and upgrade prices
        are unavailable in SV Booking. Select a provider result to review room options before
        checkout.
      </p>
    </div>
  );
}
