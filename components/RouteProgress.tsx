'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPathname = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      // Start progress animation
      setVisible(true);
      setProgress(20);

      let current = 20;
      timerRef.current = setInterval(() => {
        current += Math.random() * 15;
        if (current >= 90) {
          current = 90;
          if (timerRef.current) clearInterval(timerRef.current);
        }
        setProgress(current);
      }, 150);

      // Complete after a small delay (simulating page load)
      const done = setTimeout(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(100);
        setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 300);
      }, 500);

      prevPathname.current = pathname;

      return () => {
        clearTimeout(done);
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-0.5">
      <div
        className="h-full bg-blue-500 transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
