import type { DemoUser } from '../context/AuthContext';

/**
 * Verifica se o usuário tem permissão para acessar o caminho informado.
 * Utilizado pelo ProtectedLayout para redirecionar caso negado.
 */
export function canAccessPath(user: DemoUser, pathname: string): boolean {
  if (pathname === '/minha-conta') {
    return true;
  }

  if (pathname.startsWith('/suporte')) {
    return user.role === 'suporte';
  }

  if (pathname.includes('/auditoria')) {
    return false;
  }

  if (pathname === '/albergue/relatorios') {
    return user.role === 'gestora' || user.role === 'equipe_tecnica' || user.role === 'coordenador_albergue';
  }

  if (pathname === '/creche/relatorios') {
    return user.role === 'gestora' || user.role === 'equipe_tecnica' || user.role === 'coordenador_creche';
  }

  if (pathname === '/lojas/secretaria/relatorio-executivo') {
    return user.role === 'gestora' || user.role === 'financeiro';
  }

  if (pathname === '/lojas/secretaria/caixa') {
    return user.role === 'financeiro';
  }

  if (user.role === 'suporte') {
    return false;
  }

  if (user.role === 'gestora') {
    if (pathname.startsWith('/lojas/') && pathname !== '/lojas/secretaria') {
      return false;
    }

    return true;
  }

  if (user.role === 'equipe_tecnica') {
    if (pathname.startsWith('/lojas/') && !pathname.startsWith('/lojas/secretaria')) {
      return false;
    }

    return true;
  }

  if (user.role === 'coordenador_albergue' || user.role === 'educador_albergue') {
    return pathname.startsWith('/albergue') || pathname === '/dashboard';
  }

  if (user.role === 'coordenador_creche' || user.role === 'educador_creche') {
    return pathname.startsWith('/creche');
  }

  if (user.role === 'financeiro') {
    return pathname === '/lojas/secretaria' || pathname.startsWith('/lojas/secretaria/');
  }

  if (user.role === 'loja_bazar') {
    return pathname === '/lojas/bazar' || pathname === '/lojas/bazar/produtos';
  }

  if (user.role === 'loja_brecho') {
    return pathname === '/lojas/brecho' || pathname === '/lojas/brecho/produtos';
  }

  if (user.role === 'loja_feirao') {
    return pathname === '/lojas/feirao' || pathname === '/lojas/feirao/produtos';
  }

  return false;
}
