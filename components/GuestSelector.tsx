'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from '@/components/LocaleProvider';

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

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
  const { t } = useLocale();
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
        <span className="text-slate-500 me-1">&#128101;</span>
        {interpolate(t('gsSummary'), {
          guests,
          guestWord: guests === 1 ? t('gsGuestSingular') : t('gsGuestPlural'),
          rooms,
          roomWord: rooms === 1 ? t('gsRoomSingular') : t('gsRoomPlural'),
        })}
      </button>

      {open && (
        <div className="absolute top-full start-0 end-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-800 text-sm">{t('tripGuests')}</div>
              <div className="text-xs text-slate-500">{t('gsAdults')}</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onGuestsChange(Math.max(1, guests - 1))}
                disabled={guests <= 1}
                className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={t('gsDecreaseGuests')}
              >
                &minus;
              </button>
              <span className="w-6 text-center font-semibold text-slate-900">{guests}</span>
              <button
                type="button"
                onClick={() => onGuestsChange(Math.min(10, guests + 1))}
                disabled={guests >= 10}
                className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={t('gsIncreaseGuests')}
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-800 text-sm">{t('gsRooms')}</div>
              <div className="text-xs text-slate-500">{t('gsNumberOfRooms')}</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onRoomsChange(Math.max(1, rooms - 1))}
                disabled={rooms <= 1}
                className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={t('gsDecreaseRooms')}
              >
                &minus;
              </button>
              <span className="w-6 text-center font-semibold text-slate-900">{rooms}</span>
              <button
                type="button"
                onClick={() => onRoomsChange(Math.min(5, rooms + 1))}
                disabled={rooms >= 5}
                className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={t('gsIncreaseRooms')}
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
            {t('gsDone')}
          </button>
        </div>
      )}
    </div>
  );
}
