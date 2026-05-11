'use client';

import { Building2, Globe2, ShieldCheck, TrendingUp } from 'lucide-react';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import Reveal from '@/components/ui/Reveal';

const STATS = [
  { icon: Building2, value: 15, suffix: '+', label: 'Curated hotels', color: 'from-indigo-500 to-blue-500' },
  { icon: Globe2, value: 10, suffix: '', label: 'Destinations', color: 'from-purple-500 to-pink-500' },
  { icon: ShieldCheck, value: 5, suffix: '+', label: 'Price providers', color: 'from-emerald-500 to-teal-500' },
  { icon: TrendingUp, value: 35, suffix: '%', label: 'Average savings', color: 'from-amber-500 to-orange-500' },
];

export default function HomeStats() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="relative p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden group">
                <div
                  className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-linear-to-br ${s.color} opacity-10 group-hover:opacity-20 transition-opacity`}
                />
                <div
                  className={`w-12 h-12 rounded-xl bg-linear-to-br ${s.color} flex items-center justify-center text-white mb-4`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white">
                  <AnimatedCounter value={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{s.label}</div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
