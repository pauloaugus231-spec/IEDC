import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if (import.meta.env.DEV) {
  window.addEventListener('error', (event) => {
    console.error('[boot] erro capturado', {
      message: event.message,
      file: event.filename,
      line: event.lineno,
      column: event.colno,
      error: event.error,
    });
  });
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: unknown }
> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) {
      console.error('[boot] Erro em runtime (capturado pelo ErrorBoundary):', error);
    }
  }

  render() {
    if (this.state.error) {
      const err = this.state.error as any;
      return (
        <pre style={{ whiteSpace: 'pre-wrap', padding: 16, color: '#b91c1c' }}>
          {import.meta.env.DEV ? String(err?.stack || err) : 'Não foi possível carregar esta tela.'}
        </pre>
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
