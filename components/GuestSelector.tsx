'use client';

import { useState, useRef, useEffect } from 'react';

interface GuestSelectorProps {
  guests: number;
  rooms: number;
  onGuestsChange: (guests: number) => void;
  onRoomsChange: (rooms: number) => void;
  className?: string;
}

export default function GuestSelector({
  guests,
  rooms,
  onGuestsChange,
  onRoomsChange,
  className = '',
}: GuestSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-left text-slate-900 bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="text-slate-500 mr-1">&#128101;</span>
        {guests} guest{guests !== 1 ? 's' : ''}, {rooms} room{rooms !== 1 ? 's' : ''}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-800 text-sm">Guests</div>
              <div className="text-xs text-slate-500">Adults</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onGuestsChange(Math.max(1, guests - 1))}
                disabled={guests <= 1}
                className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Decrease guests"
              >
                &minus;
              </button>
              <span className="w-6 text-center font-semibold text-slate-900">{guests}</span>
              <button
                type="button"
                onClick={() => onGuestsChange(Math.min(10, guests + 1))}
                disabled={guests >= 10}
                className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Increase guests"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-800 text-sm">Rooms</div>
              <div className="text-xs text-slate-500">Number of rooms</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onRoomsChange(Math.max(1, rooms - 1))}
                disabled={rooms <= 1}
                className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Decrease rooms"
              >
                &minus;
              </button>
              <span className="w-6 text-center font-semibold text-slate-900">{rooms}</span>
              <button
                type="button"
                onClick={() => onRoomsChange(Math.min(5, rooms + 1))}
                disabled={rooms >= 5}
                className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Increase rooms"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
