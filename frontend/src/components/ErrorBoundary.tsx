import { Component, type ReactNode } from "react";

interface Props {
    children: ReactNode;
}
interface State {
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: { componentStack: string }) {
        // In production this goes to Sentry
        console.error("ErrorBoundary caught:", error, info.componentStack);
    }

    render() {
        if (this.state.error) {
            return (
                <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
                    <div className="text-center max-w-sm">
                        <div className="w-12 h-12 bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-6 h-6 text-red-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-gray-100 font-semibold mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-gray-500 text-sm mb-2">
                            {this.state.error.message}
                        </p>
                        <button
                            onClick={() => {
                                this.setState({ error: null });
                                window.location.href = "/dashboard";
                            }}
                            className="bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-700 transition"
                        >
                            Back to dashboard
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
