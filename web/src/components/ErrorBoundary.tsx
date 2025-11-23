import { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader } from './Card';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <span>⚠️</span> Algo salió mal
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">Ha ocurrido un error inesperado en la aplicación.</p>

                {this.state.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 overflow-auto max-h-60">
                    <p className="font-mono text-xs text-red-800 whitespace-pre-wrap">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <p className="font-mono text-xs text-red-700 mt-2 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button onClick={this.handleReload} className="w-full" variant="primary">
                    Recargar Página
                  </Button>
                  <Button
                    onClick={() => {
                      localStorage.clear();
                      this.handleReload();
                    }}
                    className="w-full"
                    variant="danger"
                  >
                    Borrar Caché y Recargar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
