import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
          <div className="rounded-2xl border border-rose-200 bg-white p-8 shadow-sm max-w-md w-full">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl">
              💥
            </div>
            <h1 className="mb-2 text-2xl font-bold text-stone-900">Something went wrong</h1>
            <p className="mb-6 text-sm text-stone-500">
              An unexpected error occurred in the application. We apologize for the inconvenience.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700"
            >
              Refresh Page
            </button>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 w-full overflow-x-auto rounded-lg bg-stone-900 p-4 text-left text-xs text-stone-300 custom-scrollbar">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
