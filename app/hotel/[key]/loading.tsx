export default function HotelLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="relative h-72 md:h-96 bg-slate-200 animate-pulse" />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="flex gap-2">
          <div className="h-6 bg-slate-200 rounded-full w-28 animate-pulse" />
          <div className="h-6 bg-slate-200 rounded-full w-28 animate-pulse" />
        </div>
        <div className="h-4 bg-slate-200 rounded w-20 animate-pulse" />
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse space-y-4 mt-4">
          <div className="h-6 bg-slate-200 rounded w-56" />
          <div className="flex gap-3">
            <div className="h-8 bg-slate-200 rounded-full w-24" />
            <div className="h-8 bg-slate-200 rounded-full w-24" />
            <div className="h-8 bg-slate-200 rounded-full w-24" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-slate-200 rounded-lg" />
            <div className="h-10 bg-slate-200 rounded-lg" />
          </div>
          <div className="h-12 bg-blue-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
