'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Notification {
  id: string;
  type: 'price_drop' | 'deal' | 'tip' | 'system';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  href?: string;
}

const TIPS: Array<{ title: string; message: string }> = [
  { title: 'Pro tip: Flexible dates save money', message: 'Shifting your trip by 1-2 days can save up to 40%. Try our Cheaper Dates tool!' },
  { title: 'Compare before you book', message: 'Hotel prices vary by 15-30% across providers. Always compare on SVBooking.' },
  { title: 'Set a price alert', message: 'Track prices on any hotel and get notified when they drop.' },
  { title: 'Try the AI Deal Scanner', message: 'Our agents monitor prices 24/7 and find deals you might miss.' },
  { title: 'Save your favorites', message: 'Heart any hotel to track it. View all your favorites from the nav menu.' },
];

function generateNotifications(): Notification[] {
  const now = Date.now();
  const dayMs = 86400000;
  const tip = TIPS[Math.floor(now / dayMs) % TIPS.length];

  return [
    {
      id: 'tip-' + Math.floor(now / dayMs),
      type: 'tip',
      title: tip.title,
      message: tip.message,
      timestamp: now - 3600000,
      read: false,
    },
    {
      id: 'deal-daily',
      type: 'deal',
      title: 'New deals available!',
      message: 'We found great prices on hotels in popular destinations. Check today\'s deals.',
      timestamp: now - 7200000,
      read: false,
      href: '/deals',
    },
    {
      id: 'system-welcome',
      type: 'system',
      title: 'Welcome to SVBooking',
      message: 'Start by searching for a hotel or exploring destinations.',
      timestamp: now - dayMs * 2,
      read: true,
    },
  ];
}

export default function NotificationBell({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sv-notifications');
      if (stored) {
        const parsed = JSON.parse(stored) as Notification[];
        // Refresh if older than 1 day
        const newest = parsed[0]?.timestamp || 0;
        if (Date.now() - newest > 86400000) {
          const fresh = generateNotifications();
          localStorage.setItem('sv-notifications', JSON.stringify(fresh));
          setNotifications(fresh);
        } else {
          setNotifications(parsed);
        }
      } else {
        const fresh = generateNotifications();
        localStorage.setItem('sv-notifications', JSON.stringify(fresh));
        setNotifications(fresh);
      }
    } catch {
      setNotifications(generateNotifications());
    }
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    try {
      localStorage.setItem('sv-notifications', JSON.stringify(updated));
    } catch {}
  }, [notifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const iconFor = (type: string) => {
    switch (type) {
      case 'price_drop': return '📉';
      case 'deal': return '🔥';
      case 'tip': return '💡';
      case 'system': return 'ℹ️';
      default: return '🔔';
    }
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div ref={panelRef} className={`relative ${className}`}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && unread > 0) markAllRead();
        }}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
            {notifications.some((n) => !n.read) && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition ${
                    !n.read ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="flex gap-2">
                    <span className="text-sm shrink-0 mt-0.5">{iconFor(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-slate-900 leading-tight">
                          {n.title}
                        </h4>
                        <span className="text-[9px] text-slate-400 shrink-0">
                          {timeAgo(n.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        {n.message}
                      </p>
                      {n.href && (
                        <a
                          href={n.href}
                          className="inline-block text-[10px] text-blue-600 font-medium mt-1 hover:text-blue-700"
                        >
                          View →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-slate-100 text-center">
            <a
              href="/agents"
              className="text-xs text-slate-500 hover:text-blue-600 transition"
            >
              Manage notification preferences →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
