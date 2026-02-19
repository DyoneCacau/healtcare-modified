import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-6 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive">
          <p className="font-medium">Erro ao carregar esta seção.</p>
          <p className="text-sm mt-1">Tente recarregar a página ou selecione outra aba.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
