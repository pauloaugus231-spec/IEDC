import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { normalizeErrorPayload, sendFrontendErrorReport } from './observability/frontendErrors'

window.addEventListener('error', (event) => {
  const payload = normalizeErrorPayload(event.error || event.message, 'window.error', {
    file: event.filename,
    line: event.lineno,
    column: event.colno,
  });
  sendFrontendErrorReport(payload);

  if (import.meta.env.DEV) {
    console.error('[boot] erro capturado', payload);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const payload = normalizeErrorPayload(event.reason, 'window.unhandledrejection');
  sendFrontendErrorReport(payload);

  if (import.meta.env.DEV) {
    console.error('[boot] promessa rejeitada sem tratamento', payload);
  }
});

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: unknown }
> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    sendFrontendErrorReport({
      ...normalizeErrorPayload(error, 'react.error_boundary'),
      componentStack: info.componentStack || undefined,
    });

    if (import.meta.env.DEV) {
      console.error('[boot] Erro em runtime (capturado pelo ErrorBoundary):', error);
    }
  }

  render() {
    if (this.state.error) {
      const err = this.state.error as any;
      return (
        <main className="root-error-shell" role="alert">
          <section>
            <p>Sistema Dias da Cruz</p>
            <h1>Não foi possível carregar esta tela.</h1>
            <span>
              O erro foi registrado para análise técnica. Atualize a página; se persistir, acione o suporte.
            </span>
            {import.meta.env.DEV ? <pre>{String(err?.stack || err)}</pre> : null}
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  console.error('[boot] #root não encontrado no index.html');
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>
  );
}
