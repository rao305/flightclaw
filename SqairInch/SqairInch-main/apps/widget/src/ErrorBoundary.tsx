import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Sqairinch] ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ fontFamily: "sans-serif", padding: "16px" }}>
          <p style={{ margin: "0 0 8px", fontSize: "14px" }}>Something went wrong.</p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{ padding: "8px 16px", cursor: "pointer" }}
          >
            Reset
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
