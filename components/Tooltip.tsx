'use client';

import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
}

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (visible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        x: rect.left + rect.width / 2,
        y: position === 'top' ? rect.top - 8 : rect.bottom + 8,
      });
    }
  }, [visible, position]);

  return (
    <span
      ref={triggerRef}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      className="relative inline-flex"
      tabIndex={0}
      role="button"
      aria-describedby={visible ? 'tooltip' : undefined}
    >
      {children}
      {visible && (
        <span
          id="tooltip"
          role="tooltip"
          className={`absolute z-50 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 rounded-lg shadow-lg whitespace-nowrap pointer-events-none left-1/2 -translate-x-1/2 ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {content}
          <span
            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
              position === 'top'
                ? 'top-full border-t-slate-800'
                : 'bottom-full border-b-slate-800'
            }`}
          />
        </span>
      )}
    </span>
  );
}
