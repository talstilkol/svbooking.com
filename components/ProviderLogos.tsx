export default function ProviderLogos({ className = '' }: { className?: string }) {
  const coverageStates = [
    'Configured sources only',
    'Links only when returned',
    'Missing rates stay unavailable',
  ];

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      aria-label="Pricing source coverage policy"
    >
      <span className="text-xs text-slate-500 font-medium mr-1">Rate sources:</span>
      {coverageStates.map((label) => (
        <span
          key={label}
          className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
