import React from 'react';

interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1rem' }}>
            {this.state.error?.message ?? 'Unexpected error occurred'}
          </p>
          <button onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
