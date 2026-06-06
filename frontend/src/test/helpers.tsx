import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import type { DemoUser } from '../context/AuthContext';

/**
 * Wrapper padrão para testes que precisam de Router + AuthProvider.
 * Usa MemoryRouter para controle de rotas em testes.
 */
export function TestProviders({
  children,
  initialEntries = ['/'],
}: {
  children: ReactNode;
  initialEntries?: string[];
}) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

/** Cria um stub mínimo de DemoUser com defaults sensíveis */
export function createTestUser(overrides: Partial<DemoUser> = {}): DemoUser {
  return {
    id: 'test-user',
    login: 'test',
    name: 'Test User',
    displayName: 'Test User',
    role: 'gestora',
    roleLabel: 'Gestão',
    service: 'gestao',
    serviceLabel: 'Gestão institucional',
    homePath: '/gestao',
    ...overrides,
  };
}
