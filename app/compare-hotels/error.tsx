'use client';

import RouteErrorState from '@/components/RouteErrorState';

export default function CompareHotelsError({
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
      icon="⚖️"
      titleKey="routeErrorCompareHotelsTitle"
      descriptionKey="routeErrorCompareHotelsDesc"
      secondaryHref="/compare"
      secondaryLabelKey="routeErrorBackToCompare"
      consoleLabel="Compare hotels page error"
    />
  );
}
