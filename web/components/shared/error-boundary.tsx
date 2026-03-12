'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
          <div className="w-16 h-16 rounded-full bg-error-light flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-error" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
          <p className="text-sm text-muted mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Reload page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
