import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card p-6 border border-error/30 bg-error/5 rounded-xl flex flex-col items-center justify-center text-center min-h-[200px]">
          <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h3 className="text-white font-semibold mb-2">Component Error</h3>
          <p className="text-text-secondary text-sm max-w-xs mx-auto">
            {this.props.fallbackMessage || "Something went wrong loading this widget."}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 text-xs text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
