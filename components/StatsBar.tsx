'use client';

import { useEffect, useRef, useState } from 'react';

function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

export default function StatsBar() {
  const hotels = useCountUp(63);
  const cities = useCountUp(20);
  const providers = useCountUp(8);
  const countries = useCountUp(15);

  return (
    <section className="bg-blue-600 text-white py-8">
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div ref={hotels.ref}>
          <p className="text-3xl md:text-4xl font-bold">{hotels.count}+</p>
          <p className="text-blue-200 text-sm mt-1">Hotels</p>
        </div>
        <div ref={cities.ref}>
          <p className="text-3xl md:text-4xl font-bold">{cities.count}</p>
          <p className="text-blue-200 text-sm mt-1">Cities</p>
        </div>
        <div ref={providers.ref}>
          <p className="text-3xl md:text-4xl font-bold">{providers.count}+</p>
          <p className="text-blue-200 text-sm mt-1">Providers</p>
        </div>
        <div ref={countries.ref}>
          <p className="text-3xl md:text-4xl font-bold">{countries.count}+</p>
          <p className="text-blue-200 text-sm mt-1">Countries</p>
        </div>
      </div>
    </section>
  );
}
