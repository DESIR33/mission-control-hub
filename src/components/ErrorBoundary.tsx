import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional label shown in the error UI to help identify the section */
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.section ? ` — ${this.props.section}` : ""}]`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[120px]">
          <AlertTriangle className="w-6 h-6 text-warning" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-card-foreground">
              {this.props.section ? `"${this.props.section}" failed to load` : "Something went wrong"}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm break-words">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mt-1"
          >
            <RefreshCw className="w-3 h-3" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
