'use client';

import { Search, BarChart3, Bot } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';

const STEPS = [
  {
    icon: Search,
    title: '1. Search',
    desc: 'Browse curated hotels across 20 cities. Save your favorites.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: BarChart3,
    title: '2. Compare',
    desc: 'See live rates from Booking, Expedia, Hotels.com, Agoda & more.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Bot,
    title: '3. Let AI decide',
    desc: 'Our agent weighs price + provider trust to recommend the best deal.',
    color: 'from-emerald-500 to-teal-500',
  },
];

export default function HomeHowItWorks() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-20">
      <Reveal>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">How it works</h2>
          <p className="mt-3 text-slate-600">Three steps to your best stay</p>
        </div>
      </Reveal>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.title} delay={i * 0.12}>
              <div className="group relative p-8 rounded-3xl bg-white border border-slate-200/60 hover:border-slate-300 transition-all hover:-translate-y-1 hover:shadow-xl">
                <div
                  className={`w-14 h-14 rounded-2xl bg-linear-to-br ${s.color} flex items-center justify-center text-white mb-4 group-hover:rotate-6 transition-transform`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-slate-600">{s.desc}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
