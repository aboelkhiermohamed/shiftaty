import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full bg-card rounded-xl p-6 shadow-lg border border-border text-center">
                        <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="h-6 w-6 text-destructive" />
                        </div>
                        <h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1>
                        <p className="text-muted-foreground text-sm mb-6">
                            An unexpected error occurred. We've logged this issue.
                            Please try reloading the application.
                        </p>

                        {this.state.error && (
                            <div className="bg-muted p-3 rounded-lg text-left mb-6 overflow-auto max-h-32">
                                <p className="text-xs font-mono text-muted-foreground">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <Button onClick={() => window.location.reload()} className="w-full">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reload Application
                        </Button>

                        <Button
                            variant="ghost"
                            onClick={() => {
                                localStorage.clear();
                                window.location.reload();
                            }}
                            className="w-full mt-2 text-destructive hover:text-destructive"
                        >
                            Clear Data & Reset (Emergency)
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
