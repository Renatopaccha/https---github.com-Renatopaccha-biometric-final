import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component to catch and handle rendering errors in child components.
 * Prevents white screen crashes by displaying a fallback UI when errors occur.
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error details for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    resetError = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError && this.state.error) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.state.errorInfo!, this.resetError);
            }

            // Default fallback UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-md w-full space-y-4">
                        <div className="rounded-lg bg-red-50 border-2 border-red-200 p-6">
                            <div className="flex items-center mb-4">
                                <div className="flex-shrink-0">
                                    <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="ml-3 text-lg font-medium text-red-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                    Error de Renderizado
                                </h3>
                            </div>

                            <div className="text-sm text-red-700" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                <p className="mb-2">Lo sentimos, ocurrió un error al renderizar este componente.</p>
                                <p className="font-semibold mb-1">Detalles:</p>
                                <pre className="text-xs bg-red-100 p-3 rounded overflow-auto max-h-32 border border-red-300">
                                    {this.state.error.toString()}
                                </pre>
                            </div>

                            {this.state.errorInfo && (
                                <details className="mt-4">
                                    <summary className="text-sm font-medium text-red-800 cursor-pointer hover:text-red-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                        Stack Trace (Técnico)
                                    </summary>
                                    <pre className="mt-2 text-xs bg-red-100 p-3 rounded overflow-auto max-h-48 border border-red-300" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                </details>
                            )}

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={this.resetError}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                                >
                                    Reintentar
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm"
                                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                                >
                                    Recargar Página
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
