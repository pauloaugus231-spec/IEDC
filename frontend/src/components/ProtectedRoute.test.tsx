import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { type ReactNode, Suspense } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { canAccessPath } from '../utils/canAccessPath';
import type { DemoUser } from '../context/AuthContext';

/* ──────────────────────────────────────────────────────
 * Replica mínima do ProtectedLayout de App.tsx
 * para testes isolados de redirecionamento.
 * ────────────────────────────────────────────────────── */
function ProtectedLayout({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (currentUser.mustChangePassword && location.pathname !== '/minha-conta') {
    return <Navigate replace to="/minha-conta?trocarSenha=1" />;
  }

  if (!canAccessPath(currentUser, location.pathname)) {
    return <Navigate replace to={currentUser.homePath} />;
  }

  return <Suspense fallback={null}>{children}</Suspense>;
}

/** Componente helper que exibe a rota atual para assertions */
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

function stubUser(overrides: Partial<DemoUser> = {}): DemoUser {
  return {
    id: 'test',
    login: 'test',
    name: 'Test',
    displayName: 'Test',
    role: 'gestora',
    roleLabel: 'Gestão',
    service: 'gestao',
    serviceLabel: 'Gestão',
    homePath: '/gestao',
    ...overrides,
  };
}

/** Persiste um usuário no localStorage para que o AuthProvider o reconheça */
function seedAuth(user: DemoUser) {
  localStorage.setItem('iedc_auth_user', JSON.stringify(user));
}

function renderProtected(path: string, user?: DemoUser | null) {
  if (user) {
    seedAuth(user);
  }

  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LocationDisplay />} />
          <Route path="/minha-conta" element={<LocationDisplay />} />
          <Route
            path="*"
            element={
              <ProtectedLayout>
                <div data-testid="protected-content">Conteúdo protegido</div>
                <LocationDisplay />
              </ProtectedLayout>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute — redirecionamentos de autenticação', () => {
  beforeEach(() => {
    localStorage.clear();
    // Stub fetch para evitar chamadas reais (AuthProvider faz fetch de profiles)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve([]),
    });
  });

  // ── Sem autenticação ──
  it('redireciona para /login quando não há usuário autenticado', () => {
    renderProtected('/gestao');
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('redireciona para /login ao acessar /albergue sem autenticação', () => {
    renderProtected('/albergue');
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('redireciona para /login ao acessar /escola sem autenticação', () => {
    renderProtected('/escola');
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  // ── Com autenticação válida ──
  it('renderiza conteúdo quando gestora acessa /gestao', () => {
    renderProtected('/gestao', stubUser());
    expect(screen.getByTestId('protected-content')).toHaveTextContent('Conteúdo protegido');
  });

  it('renderiza conteúdo quando coordenador_albergue acessa /albergue', () => {
    renderProtected('/albergue', stubUser({ role: 'coordenador_albergue', homePath: '/albergue' }));
    expect(screen.getByTestId('protected-content')).toHaveTextContent('Conteúdo protegido');
  });

  it('renderiza conteúdo quando coordenador_creche acessa /escola', () => {
    renderProtected('/escola', stubUser({ role: 'coordenador_creche', homePath: '/escola' }));
    expect(screen.getByTestId('protected-content')).toHaveTextContent('Conteúdo protegido');
  });

  // ── mustChangePassword ──
  it('redireciona para /minha-conta quando mustChangePassword=true', () => {
    renderProtected('/gestao', stubUser({ mustChangePassword: true }));
    expect(screen.getByTestId('location')).toHaveTextContent('/minha-conta');
    expect(screen.getByTestId('location')).toHaveTextContent('trocarSenha=1');
  });

  it('permite /minha-conta mesmo com mustChangePassword', () => {
    renderProtected('/minha-conta', stubUser({ mustChangePassword: true }));
    // Não redireciona — o LocationDisplay renderiza /minha-conta normalmente
    expect(screen.getByTestId('location')).toHaveTextContent('/minha-conta');
  });

  // ── Acesso negado por role ──
  it('redireciona educador_creche para /escola ao acessar /albergue', () => {
    renderProtected('/albergue', stubUser({ role: 'educador_creche', homePath: '/escola' }));
    // Redirect acontece → location mostra o homePath
    expect(screen.getByTestId('location')).toHaveTextContent('/escola');
  });

  it('redireciona suporte para /suporte/usuarios ao acessar /gestao', () => {
    renderProtected('/gestao', stubUser({ role: 'suporte', homePath: '/suporte/usuarios' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/suporte/usuarios');
  });

  it('redireciona loja_bazar para /lojas/bazar ao acessar /gestao', () => {
    renderProtected('/gestao', stubUser({ role: 'loja_bazar', homePath: '/lojas/bazar' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/lojas/bazar');
  });
});
