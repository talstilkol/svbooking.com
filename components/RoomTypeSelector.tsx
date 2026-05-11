'use client';

import { useState } from 'react';

interface RoomType {
  id: string;
  name: string;
  icon: string;
  description: string;
  amenities: string[];
  priceMultiplier: number;
  maxGuests: number;
  sqm: number;
}

const ROOM_TYPES: RoomType[] = [
  {
    id: 'standard',
    name: 'Standard Room',
    icon: '🛏️',
    description: 'Comfortable room with all essentials',
    amenities: ['Wi-Fi', 'TV', 'Air conditioning', 'Safe'],
    priceMultiplier: 1.0,
    maxGuests: 2,
    sqm: 22,
  },
  {
    id: 'superior',
    name: 'Superior Room',
    icon: '✨',
    description: 'Upgraded room with city or garden view',
    amenities: ['Wi-Fi', 'TV', 'Air conditioning', 'Safe', 'Minibar', 'City view'],
    priceMultiplier: 1.3,
    maxGuests: 2,
    sqm: 28,
  },
  {
    id: 'deluxe',
    name: 'Deluxe Suite',
    icon: '👑',
    description: 'Spacious suite with separate living area',
    amenities: ['Wi-Fi', 'Smart TV', 'Air conditioning', 'Safe', 'Minibar', 'Balcony', 'Living area', 'Premium view'],
    priceMultiplier: 1.8,
    maxGuests: 3,
    sqm: 42,
  },
  {
    id: 'family',
    name: 'Family Room',
    icon: '👨‍👩‍👧‍👦',
    description: 'Extra space designed for families with kids',
    amenities: ['Wi-Fi', 'TV', 'Air conditioning', 'Safe', 'Extra beds', 'Kid-friendly'],
    priceMultiplier: 1.5,
    maxGuests: 4,
    sqm: 35,
  },
];

interface RoomTypeSelectorProps {
  basePrice: number;
  currency?: string;
  onSelect?: (roomType: RoomType) => void;
  className?: string;
}

export default function RoomTypeSelector({
  basePrice,
  currency = '$',
  onSelect,
  className = '',
}: RoomTypeSelectorProps) {
  const [selected, setSelected] = useState('standard');

  const handleSelect = (room: RoomType) => {
    setSelected(room.id);
    onSelect?.(room);
  };

  return (
    <div className={className}>
      <h3 className="text-lg font-bold text-slate-900 mb-4">🛏️ Choose Room Type</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ROOM_TYPES.map((room) => {
          const price = Math.round(basePrice * room.priceMultiplier);
          const isSelected = selected === room.id;

          return (
            <button
              key={room.id}
              onClick={() => handleSelect(room)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{room.icon}</span>
                  <h4 className="font-semibold text-slate-900 text-sm">{room.name}</h4>
                </div>
                {isSelected && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 mb-2">{room.description}</p>

              <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                <span>👥 Up to {room.maxGuests}</span>
                <span>📐 {room.sqm}m²</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {room.amenities.slice(0, 4).map((a) => (
                  <span
                    key={a}
                    className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                  >
                    {a}
                  </span>
                ))}
                {room.amenities.length > 4 && (
                  <span className="text-[10px] text-slate-400">
                    +{room.amenities.length - 4} more
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-slate-900">
                  {currency}{price}
                </span>
                <span className="text-xs text-slate-400">/night</span>
                {room.priceMultiplier > 1 && (
                  <span className="text-[10px] text-amber-600 ml-auto">
                    +{Math.round((room.priceMultiplier - 1) * 100)}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
