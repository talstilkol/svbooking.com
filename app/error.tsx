'use client';

import RouteErrorState from '@/components/RouteErrorState';

export default function Error({
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
      icon="🌊"
      titleKey="routeErrorAppTitle"
      descriptionKey="routeErrorAppDesc"
      secondaryHref="/"
      secondaryLabelKey="routeErrorGoHome"
      consoleLabel="App error"
    />
  );
}
