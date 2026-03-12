'use client';

import { ToastProvider } from './toast';
import { ErrorBoundary } from './error-boundary';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>{children}</ToastProvider>
    </ErrorBoundary>
  );
}
