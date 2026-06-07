'use client';

import RouteErrorState from '@/components/RouteErrorState';

export default function HotelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorState
      error={error}
      reset={reset}
      icon="🏨"
      titleKey="routeErrorHotelTitle"
      descriptionKey="routeErrorHotelDesc"
      secondaryHref="/search"
      secondaryLabelKey="routeErrorBrowseHotels"
      consoleLabel="Hotel page error"
    />
  );
}
