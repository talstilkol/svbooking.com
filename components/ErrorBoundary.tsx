'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { useLocale } from '@/components/LocaleProvider';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface BoundaryImplProps extends Props {
  defaultFallback: (error: Error | null, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryImpl extends Component<BoundaryImplProps, State> {
  constructor(props: BoundaryImplProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return this.props.defaultFallback(this.state.error, () => this.setState({ hasError: false, error: null }));
    }

    return this.props.children;
  }
}

export default function ErrorBoundary(props: Props) {
  const { t } = useLocale();

  return (
    <ErrorBoundaryImpl
      {...props}
      defaultFallback={(error, reset) => (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 mb-1">{t('errorBoundaryTitle')}</h3>
          <p className="text-sm text-red-600 mb-4">
            {error?.message || t('errorBoundaryUnexpected')}
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition"
          >
            {t('errorBoundaryTryAgain')}
          </button>
        </div>
      )}
    />
  );
}
