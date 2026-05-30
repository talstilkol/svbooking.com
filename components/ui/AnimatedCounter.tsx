'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counts up from 0 to `value` once the element scrolls into view, with a cubic
 * ease-out. CSS-only fade-in (no animation library) + requestAnimationFrame
 * for the number tween.
 */
export default function AnimatedCounter({
  value,
  duration = 1.2,
  prefix = '',
  suffix = '',
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      const timer = setTimeout(() => setInView(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span
      ref={ref}
      style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.4s ease' }}
    >
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
