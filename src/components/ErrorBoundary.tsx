import React from 'react';
import { cn } from '../utils/cn';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center h-full bg-theme-base text-theme-primary font-ui px-8">
          <div className="max-w-sm text-center">
            <div className="w-12 h-12 mx-auto mb-6 rounded-full bg-theme-elevated flex items-center justify-center">
              <span className="text-xl">!</span>
            </div>
            <h2 className="text-[15px] font-normal tracking-[-0.02em] mb-2">
              Something went wrong
            </h2>
            <p className="text-[12px] text-theme-muted leading-relaxed mb-6">
              {this.state.error?.message || 'An unexpected error occurred while rendering.'}
            </p>
            <button
              onClick={this.handleReset}
              className={cn(
                "px-4 py-2 rounded-full text-[11px] font-medium",
                "bg-theme-elevated text-theme-secondary",
                "shadow-sm hover:shadow-md",
                "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                "hover:bg-warm-500 hover:text-white hover:shadow-warm-500/25 hover:scale-105",
                "active:scale-95 active:bg-warm-600"
              )}
            >
              Back to Library
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
