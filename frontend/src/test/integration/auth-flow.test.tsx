/**
 * Teste de integração: fluxo completo de autenticação.
 *
 * Diferente dos testes unitários de LoginPage, este teste
 * verifica o fluxo end-to-end desde o formulário até o
 * redirect, passando por AuthContext + React Router.
 *
 * O mock é no nível do `fetch` global (camada de rede),
 * NÃO em serviços intermediários — preservando o acoplamento
 * real entre LoginPage → AuthContext → localStorage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import LoginPage from '../../components/LoginPage';
import { AuthProvider, useAuth } from '../../context/AuthContext';

function LocationSpy() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

/** Componente que simula uma página protegida mostrando o role do usuário logado */
function DashboardStub() {
  const { currentUser } = useAuth();
  return (
    <div>
      <div data-testid="location">/gestao</div>
      <div data-testid="user-role">{currentUser?.role}</div>
      <div data-testid="user-name">{currentUser?.displayName}</div>
    </div>
  );
}

function renderAuthFlow() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/gestao" element={<DashboardStub />} />
          <Route path="/minha-conta" element={<LocationSpy />} />
          <Route path="*" element={<LocationSpy />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function mockFetchForLogin(loginResponse: { ok: boolean; status: number; data: unknown }) {
  return vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    // POST /api/auth/login
    if (typeof url === 'string' && url.includes('/api/auth/login') && opts?.method === 'POST') {
      return Promise.resolve({
        ok: loginResponse.ok,
        status: loginResponse.status,
        json: () => Promise.resolve(loginResponse.data),
      });
    }
    // GET /api/auth/me — retorna 404 para simplificar (sem refresh)
    if (typeof url === 'string' && url.includes('/api/auth/me')) {
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    }
    // GET /api/auth/profiles — fallback
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve([]) });
  });
}

describe('Auth flow integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('login bem-sucedido redireciona para homePath do role e persiste no localStorage', async () => {
    const user = userEvent.setup();
    const gestora = {
      id: 'claudia',
      login: 'claudia',
      name: 'Claudia',
      displayName: 'Claudia',
      role: 'gestora',
      roleLabel: 'Gestão',
      service: 'gestao',
      serviceLabel: 'Gestão institucional',
      homePath: '/gestao',
    };

    globalThis.fetch = mockFetchForLogin({
      ok: true,
      status: 200,
      data: { accessToken: 'fake-jwt', user: gestora },
    });

    renderAuthFlow();

    // Verifica que começa na tela de login
    expect(screen.getByText('Acesso institucional')).toBeInTheDocument();

    // Preenche e submete
    await user.type(screen.getByLabelText('Usuário'), 'claudia');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    // Verifica redirect para /gestao
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/gestao');
    });

    // Verifica que os dados do usuário estão corretos
    expect(screen.getByTestId('user-role')).toHaveTextContent('gestora');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Claudia');

    // Verifica persistência no localStorage
    const stored = JSON.parse(localStorage.getItem('iedc_auth_user') || '{}');
    expect(stored.login).toBe('claudia');
    expect(stored.role).toBe('gestora');

    // Verifica que o token foi salvo
    expect(localStorage.getItem('iedc_auth_token')).toBe('fake-jwt');

    // Verifica que o fetch foi chamado com os dados corretos
    const loginCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('/api/auth/login'),
    );
    expect(loginCall).toBeDefined();
    const body = JSON.parse((loginCall![1] as RequestInit).body as string);
    expect(body.login).toBe('claudia');
    expect(body.password).toBe('senha123');
  });

  it('login com credenciais inválidas exibe mensagem de erro e NÃO redireciona', async () => {
    const user = userEvent.setup();

    globalThis.fetch = mockFetchForLogin({
      ok: false,
      status: 401,
      data: { message: 'Credenciais inválidas' },
    });

    renderAuthFlow();

    await user.type(screen.getByLabelText('Usuário'), 'errado');
    await user.type(screen.getByLabelText('Senha'), 'errado');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    // Verifica mensagem de erro (a mensagem vem do componente, não da API)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/usuário ou senha inválido/i);
    });

    // Verifica que NÃO redirecionou — ainda está na tela de login
    expect(screen.getByText('Acesso institucional')).toBeInTheDocument();

    // Verifica que localStorage NÃO foi alterado
    expect(localStorage.getItem('iedc_auth_token')).toBeNull();
    expect(localStorage.getItem('iedc_auth_user')).toBeNull();
  });

  it('login com erro de rede exibe mensagem de conexão', async () => {
    const user = userEvent.setup();

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/auth/login')) {
        return Promise.reject(new Error('ERR_CONNECTION_REFUSED'));
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve([]) });
    });

    renderAuthFlow();

    await user.type(screen.getByLabelText('Usuário'), 'test');
    await user.type(screen.getByLabelText('Senha'), '123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível conectar/i);
    });

    expect(localStorage.getItem('iedc_auth_token')).toBeNull();
  });

  it('usuário com mustChangePassword é redirecionado para /minha-conta após login', async () => {
    const user = userEvent.setup();

    globalThis.fetch = mockFetchForLogin({
      ok: true,
      status: 200,
      data: {
        accessToken: 'token-troca',
        user: {
          id: 'novo',
          login: 'novo',
          name: 'Novo Usuário',
          displayName: 'Novo Usuário',
          role: 'educador_albergue',
          roleLabel: 'Educador',
          service: 'albergue',
          serviceLabel: 'Albergue',
          homePath: '/albergue',
          mustChangePassword: true,
        },
      },
    });

    renderAuthFlow();

    await user.type(screen.getByLabelText('Usuário'), 'novo');
    await user.type(screen.getByLabelText('Senha'), 'temporaria');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    // LoginPage.tsx verifica mustChangePassword e faz Navigate para /minha-conta
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/minha-conta');
      expect(screen.getByTestId('location')).toHaveTextContent('trocarSenha=1');
    });
  });
});
