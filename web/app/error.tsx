'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-error-light flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-error" />
      </div>
      <h2
        className="text-2xl font-bold text-foreground mb-2"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Something went wrong
      </h2>
      <p className="text-muted max-w-sm mb-6">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}
