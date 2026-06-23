import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { AuthProvider } from '../context/AuthContext';

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('useMotion — comportamento de acessibilidade de animação', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve([]),
    });
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('renderiza cena de animação ambient (aria-hidden)', () => {
    renderLogin();
    const ambientLayer = document.querySelector('.login-motion-layer');
    expect(ambientLayer).toBeInTheDocument();
    expect(ambientLayer).toHaveAttribute('aria-hidden', 'true');
  });

  it('renderiza nós de módulo (Gestão, Albergue, E.E.I., Lojas, Comercial)', () => {
    renderLogin();
    expect(screen.getByText('Gestão')).toBeInTheDocument();
    expect(screen.getByText('Albergue')).toBeInTheDocument();
    expect(screen.getByText('E.E.I.')).toBeInTheDocument();
    expect(screen.getByText('Lojas')).toBeInTheDocument();
    expect(screen.getByText('Comercial')).toBeInTheDocument();
  });

  it('marca camada de animação como decorativa (aria-hidden="true")', () => {
    // Simula prefers-reduced-motion: reduce
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });

    renderLogin();

    // Mesmo com reduced motion, a cena é renderizada (mas com animações desabilitadas)
    // O importante é que continua marcada como decorativa
    const ambientLayer = document.querySelector('.login-motion-layer');
    expect(ambientLayer).toBeInTheDocument();
    expect(ambientLayer).toHaveAttribute('aria-hidden', 'true');
  });
});
