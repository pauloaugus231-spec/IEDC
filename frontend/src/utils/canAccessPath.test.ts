import { describe, it, expect } from 'vitest';
import { canAccessPath } from './canAccessPath';
import type { DemoUser } from '../context/AuthContext';

/** Cria um stub mínimo de DemoUser para testes */
function stubUser(role: DemoUser['role']): DemoUser {
  return {
    id: 'test',
    login: 'test',
    name: 'Test',
    displayName: 'Test User',
    role,
    roleLabel: role,
    service: 'gestao',
    serviceLabel: 'Test',
    homePath: '/',
  };
}

describe('canAccessPath — RoleGuard', () => {
  // ── /minha-conta é universal ──
  it('permite /minha-conta para qualquer role', () => {
    const roles: DemoUser['role'][] = [
      'gestora', 'suporte', 'coordenador_albergue', 'educador_creche', 'comercial', 'loja_bazar',
    ];

    for (const role of roles) {
      expect(canAccessPath(stubUser(role), '/minha-conta')).toBe(true);
    }
  });

  // ── Suporte ──
  it('suporte acessa /suporte/* e nada mais', () => {
    const user = stubUser('suporte');
    expect(canAccessPath(user, '/suporte/usuarios')).toBe(true);
    expect(canAccessPath(user, '/suporte/saude')).toBe(true);
    expect(canAccessPath(user, '/albergue')).toBe(false);
    expect(canAccessPath(user, '/gestao')).toBe(false);
  });

  // ── Gestora ──
  it('gestora acessa gestão, albergue, creche mas não lojas individuais', () => {
    const user = stubUser('gestora');
    expect(canAccessPath(user, '/gestao')).toBe(true);
    expect(canAccessPath(user, '/albergue')).toBe(true);
    expect(canAccessPath(user, '/escola')).toBe(true);
    expect(canAccessPath(user, '/lojas/secretaria')).toBe(true);
    expect(canAccessPath(user, '/lojas/bazar')).toBe(false);
    expect(canAccessPath(user, '/lojas/brecho')).toBe(false);
  });

  // ── Coordenador albergue ──
  it('coordenador_albergue acessa albergue e /dashboard, nega creche', () => {
    const user = stubUser('coordenador_albergue');
    expect(canAccessPath(user, '/albergue')).toBe(true);
    expect(canAccessPath(user, '/albergue/buscar')).toBe(true);
    expect(canAccessPath(user, '/albergue/relatorios')).toBe(true);
    expect(canAccessPath(user, '/dashboard')).toBe(true);
    expect(canAccessPath(user, '/escola')).toBe(false);
    expect(canAccessPath(user, '/gestao')).toBe(false);
  });

  // ── Financeiro ──
  it('comercial acessa apenas /lojas/secretaria e subrotas', () => {
    const user = stubUser('comercial');
    expect(canAccessPath(user, '/lojas/secretaria')).toBe(true);
    expect(canAccessPath(user, '/lojas/secretaria/caixa')).toBe(true);
    expect(canAccessPath(user, '/lojas/secretaria/historico')).toBe(true);
    expect(canAccessPath(user, '/lojas/bazar')).toBe(false);
    expect(canAccessPath(user, '/gestao')).toBe(false);
  });

  // ── Lojas específicas ──
  it('loja_bazar acessa apenas /lojas/bazar e /lojas/bazar/produtos', () => {
    const user = stubUser('loja_bazar');
    expect(canAccessPath(user, '/lojas/bazar')).toBe(true);
    expect(canAccessPath(user, '/lojas/bazar/produtos')).toBe(true);
    expect(canAccessPath(user, '/lojas/brecho')).toBe(false);
    expect(canAccessPath(user, '/gestao')).toBe(false);
  });

  it('loja_brecho acessa apenas /lojas/brecho e /lojas/brecho/produtos', () => {
    const user = stubUser('loja_brecho');
    expect(canAccessPath(user, '/lojas/brecho')).toBe(true);
    expect(canAccessPath(user, '/lojas/brecho/produtos')).toBe(true);
    expect(canAccessPath(user, '/lojas/bazar')).toBe(false);
    expect(canAccessPath(user, '/gestao')).toBe(false);
  });

  it('loja_feirao acessa apenas /lojas/feirao e /lojas/feirao/produtos', () => {
    const user = stubUser('loja_feirao');
    expect(canAccessPath(user, '/lojas/feirao')).toBe(true);
    expect(canAccessPath(user, '/lojas/feirao/produtos')).toBe(true);
    expect(canAccessPath(user, '/lojas/brecho')).toBe(false);
    expect(canAccessPath(user, '/albergue')).toBe(false);
  });

  // ── Equipe técnica ──
  it('equipe_tecnica acessa gestão, albergue, creche e relatórios, mas não lojas individuais', () => {
    const user = stubUser('equipe_tecnica');
    expect(canAccessPath(user, '/gestao')).toBe(true);
    expect(canAccessPath(user, '/albergue')).toBe(true);
    expect(canAccessPath(user, '/escola')).toBe(true);
    expect(canAccessPath(user, '/albergue/relatorios')).toBe(true);
    expect(canAccessPath(user, '/escola/relatorios')).toBe(true);
    expect(canAccessPath(user, '/lojas/secretaria')).toBe(true);
    expect(canAccessPath(user, '/lojas/secretaria/historico')).toBe(true);
    expect(canAccessPath(user, '/lojas/bazar')).toBe(false);
    expect(canAccessPath(user, '/lojas/brecho')).toBe(false);
  });

  // ── Educadores ──
  it('educador_albergue acessa /albergue/* e /dashboard', () => {
    const user = stubUser('educador_albergue');
    expect(canAccessPath(user, '/albergue')).toBe(true);
    expect(canAccessPath(user, '/albergue/buscar')).toBe(true);
    expect(canAccessPath(user, '/dashboard')).toBe(true);
    expect(canAccessPath(user, '/escola')).toBe(false);
    expect(canAccessPath(user, '/gestao')).toBe(false);
  });

  it('educador_creche acessa /escola/* apenas', () => {
    const user = stubUser('educador_creche');
    expect(canAccessPath(user, '/escola')).toBe(true);
    expect(canAccessPath(user, '/escola/turmas')).toBe(true);
    expect(canAccessPath(user, '/albergue')).toBe(false);
    expect(canAccessPath(user, '/gestao')).toBe(false);
  });

  // ── Regra de auditoria: ninguém acessa ──
  it('nenhum role acessa /auditoria', () => {
    const roles: DemoUser['role'][] = [
      'gestora', 'suporte', 'coordenador_albergue', 'equipe_tecnica', 'comercial',
    ];
    for (const role of roles) {
      expect(canAccessPath(stubUser(role), '/albergue/auditoria')).toBe(false);
    }
  });

  // ── Relatórios com restrição ──
  it('coordenador_creche acessa /escola/relatorios mas não /albergue/relatorios', () => {
    const user = stubUser('coordenador_creche');
    expect(canAccessPath(user, '/escola/relatorios')).toBe(true);
    expect(canAccessPath(user, '/albergue/relatorios')).toBe(false);
  });

  it('gestora acessa relatório financeiro executivo', () => {
    const user = stubUser('gestora');
    expect(canAccessPath(user, '/lojas/secretaria/relatorio-executivo')).toBe(true);
  });

  it('comercial acessa /lojas/secretaria/caixa', () => {
    const user = stubUser('comercial');
    expect(canAccessPath(user, '/lojas/secretaria/caixa')).toBe(true);
  });

  it('coordenador_albergue não acessa /lojas/secretaria/caixa', () => {
    const user = stubUser('coordenador_albergue');
    expect(canAccessPath(user, '/lojas/secretaria/caixa')).toBe(false);
  });
});
