import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

const sanitizeErrorText = (value: string) =>
  value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/(token|key|secret|password)=([^&\s]+)/gi, '$1=[redacted]')
    .replace(/https?:\/\/[^\s)]+/g, '[url]')
    .slice(0, 8_000);

function reportToSentry(error: Error, errorInfo: ErrorInfo) {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  try {
    const parsedDsn = new URL(dsn);
    const projectId = parsedDsn.pathname.replace(/^\/+/, '').split('/').pop();
    const publicKey = parsedDsn.username;
    if (!projectId || !publicKey) return;

    const endpoint = `${parsedDsn.protocol}//${parsedDsn.host}/api/${projectId}/store/?sentry_version=7&sentry_key=${encodeURIComponent(publicKey)}`;
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        event_id: crypto.randomUUID().replace(/-/g, ''),
        platform: 'javascript',
        level: 'error',
        message: sanitizeErrorText(error.message || error.name),
        exception: {
          values: [{
            type: error.name || 'Error',
            value: sanitizeErrorText(error.message || 'Erro não identificado'),
            stacktrace: { frames: [{ filename: 'react-component-tree', function: sanitizeErrorText(errorInfo.componentStack ?? '') }] },
          }],
        },
        tags: { boundary: 'root' },
      }),
    }).catch(() => {
      // A telemetria nunca deve causar uma segunda falha na aplicação.
    });
  } catch {
    console.warn('[ErrorBoundary] VITE_SENTRY_DSN inválido; evento não enviado.');
  }
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Falha de renderização capturada.', {
      name: error.name,
      componentStack: sanitizeErrorText(errorInfo.componentStack ?? ''),
    });
    reportToSentry(error, errorInfo);
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
