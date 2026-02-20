// INTERCEPTOR DE ERROS CRÍTICOS
window.addEventListener('error', (event) => {
  console.error('========== ERRO CRÍTICO CAPTURADO ==========');
  console.error('Mensagem:', event.message);
  console.error('Arquivo:', event.filename);
  console.error('Linha:', event.lineno, 'Coluna:', event.colno);
  console.error('Erro completo:', event.error);
  console.error('Stack:', event.error?.stack);
  console.error('============================================');
});

console.log('[boot] iniciando main.tsx (antes de qualquer import)');

import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('[boot] imports concluídos (React/App carregados)');

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: unknown }
> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown) {
    console.error('[boot] Erro em runtime (capturado pelo ErrorBoundary):', error);
  }

  render() {
    if (this.state.error) {
      const err = this.state.error as any;
      return (
        <pre style={{ whiteSpace: 'pre-wrap', padding: 16, color: '#b91c1c' }}>
          {String(err?.stack || err)}
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
  console.log('[boot] renderizando react root...');
  createRoot(rootEl).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>
  );
}
