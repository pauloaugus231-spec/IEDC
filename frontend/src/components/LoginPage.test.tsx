import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import LoginPage from './LoginPage';
import { AuthProvider } from '../context/AuthContext';

/** Fetch global stub — rejeita por padrão (nenhum backend real) */
function stubFetch(overrides?: Partial<Response>) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status: 401,
    json: () => Promise.resolve({}),
    ...overrides,
  });
}

/** Helper para verificar redirect após login */
function LocationSpy() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderLogin(initialEntries = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function renderLoginWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/gestao" element={<LocationSpy />} />
          <Route path="*" element={<LocationSpy />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = stubFetch();
  });

  it('renderiza formulário com campos de usuário e senha', () => {
    renderLogin();
    expect(screen.getByLabelText('Usuário')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('exibe título institucional e slogan', () => {
    renderLogin();
    expect(screen.getByText('Acesso institucional')).toBeInTheDocument();
    expect(screen.getByText(/gestão integrada para cuidar melhor/i)).toBeInTheDocument();
  });

  it('exibe mensagem de erro quando login falha', async () => {
    const user = userEvent.setup();
    globalThis.fetch = stubFetch({ ok: false, status: 401 });

    renderLogin();

    await user.type(screen.getByLabelText('Usuário'), 'invalido');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/usuário ou senha inválido/i);
    });
  });

  it('exibe erro de conexão quando fetch lança exceção', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    renderLogin();

    await user.type(screen.getByLabelText('Usuário'), 'test');
    await user.type(screen.getByLabelText('Senha'), '123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível conectar/i);
    });
  });

  it('desabilita botão durante submissão', async () => {
    const user = userEvent.setup();
    // fetch nunca resolve — simula loading infinito
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => undefined));

    renderLogin();

    await user.type(screen.getByLabelText('Usuário'), 'test');
    await user.type(screen.getByLabelText('Senha'), '123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled();
    });
  });

  it('login bem-sucedido redireciona para homePath do usuário', async () => {
    const user = userEvent.setup();

    // Primeiro fetch: /api/auth/profiles → fallback (nok)
    // Segundo fetch: /api/auth/login → sucesso com usuário gestora
    // Terceiro fetch: /api/auth/me → sucesso
    let fetchCallCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      fetchCallCount++;
      if (typeof url === 'string' && url.includes('/api/auth/login')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            accessToken: 'fake-jwt-token',
            user: {
              id: 'claudia',
              login: 'claudia',
              name: 'Claudia',
              displayName: 'Claudia',
              role: 'gestora',
              roleLabel: 'Gestao',
              service: 'gestao',
              serviceLabel: 'Gestao institucional',
              homePath: '/gestao',
            },
          }),
        });
      }
      // Para /api/auth/profiles e /api/auth/me
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });

    renderLoginWithRoutes();

    await user.type(screen.getByLabelText('Usuário'), 'claudia');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/gestao');
    });
  });

  it('campos de input possuem aria-invalid quando há erro', async () => {
    const user = userEvent.setup();
    globalThis.fetch = stubFetch({ ok: false, status: 401 });

    renderLogin();

    await user.type(screen.getByLabelText('Usuário'), 'invalido');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Usuário')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
