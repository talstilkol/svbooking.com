interface ReviewHighlightsProps {
  hotelKey: string;
  hotelName: string;
  className?: string;
}

export default function ReviewHighlights({ hotelKey, hotelName, className = '' }: ReviewHighlightsProps) {
  void hotelKey;
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
      <h3 className="text-lg font-semibold text-slate-800">Guest Reviews</h3>
      <p className="text-sm text-slate-600 mt-2">
        Verified guest review data for {hotelName} is unavailable. Scores and review snippets are not displayed until they come from a verified provider.
      </p>
      <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-500">
        Status: unavailable
      </div>
    </div>
  );
}
