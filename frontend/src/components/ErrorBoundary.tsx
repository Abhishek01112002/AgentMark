import React, { useState } from 'react';

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
      return this.props.fallback ?? <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error }: { error: Error | null }) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!error?.message) return;
    try {
      await navigator.clipboard.writeText(error.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <div className="p-8 text-center">
      <h2 className="font-headline-md text-headline-md text-text-primary mb-2">Something went wrong</h2>
      <p className="font-body-md text-body-md text-text-secondary mb-6">
        An unexpected error occurred. Please reload the page and try again.
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={() => window.location.reload()}
          className="font-label-md text-label-md px-4 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity cursor-pointer border-none"
        >
          Reload page
        </button>
        {error?.message && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="font-label-sm text-label-sm px-3 py-2 rounded-lg border border-border-base text-text-secondary hover:bg-surface-container-high transition-all cursor-pointer"
          >
            {showDetails ? 'Hide technical details' : 'Show technical details'}
          </button>
        )}
      </div>
      {showDetails && error?.message && (
        <div className="mt-4 max-w-lg mx-auto">
          <pre
            className="text-left text-xs p-3 rounded-lg overflow-auto whitespace-pre-wrap break-all"
            style={{ backgroundColor: '#111118', border: '1px solid #2A2A38', color: '#8B8B9E', maxHeight: '200px' }}
          >
            {error.message}
          </pre>
          <button
            onClick={handleCopy}
            className="mt-2 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer bg-transparent border-none"
          >
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </div>
      )}
    </div>
  );
}
