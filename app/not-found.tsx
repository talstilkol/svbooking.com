import Link from 'next/link';

const SUGGESTIONS = [
  { href: '/search', label: 'Browse Hotels', icon: '🏨' },
  { href: '/compare', label: 'Compare Prices', icon: '💰' },
  { href: '/explore', label: 'Explore Destinations', icon: '🗺️' },
  { href: '/agents', label: 'AI Agents', icon: '🤖' },
];

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8">
      <div className="max-w-lg w-full text-center">
        <div className="text-8xl mb-6 opacity-80">🏝️</div>
        <h1 className="text-4xl font-bold text-slate-900 mb-3">Lost in paradise?</h1>
        <p className="text-lg text-slate-600 mb-8">
          This page doesn&apos;t exist, but there are plenty of hotels to discover.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {SUGGESTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-left"
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="font-medium text-slate-700 text-sm">{s.label}</span>
            </Link>
          ))}
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
