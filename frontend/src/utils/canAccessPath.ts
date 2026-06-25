import type { DemoUser } from '../context/AuthContext';
import {
  ALBERGUE_COORDINATION_ROLES,
  ALBERGUE_DATA_QUALITY_ROLES,
  ALBERGUE_MANAGEMENT_READ_ROLES,
  ALBERGUE_OPERATION_ROLES,
  ALBERGUE_PERSON_READ_ROLES,
  ALBERGUE_READ_ROLES,
  hasAlbergueRole,
} from './alberguePermissions';

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
    return hasAlbergueRole(user.role, ALBERGUE_MANAGEMENT_READ_ROLES);
  }

  if (pathname === '/albergue/conferencia-rma') {
    return hasAlbergueRole(user.role, ALBERGUE_COORDINATION_ROLES);
  }

  if (pathname === '/albergue/qualidade-dados') {
    return hasAlbergueRole(user.role, ALBERGUE_DATA_QUALITY_ROLES);
  }

  if (pathname === '/albergue/presencas') {
    return hasAlbergueRole(user.role, ALBERGUE_OPERATION_ROLES);
  }

  if (pathname === '/albergue/buscar' || pathname.startsWith('/albergue/pessoa/')) {
    return hasAlbergueRole(user.role, ALBERGUE_PERSON_READ_ROLES);
  }

  if (pathname.startsWith('/pessoa/')) {
    return hasAlbergueRole(user.role, ALBERGUE_PERSON_READ_ROLES);
  }

  if (pathname === '/escola/relatorios') {
    return user.role === 'gestora' || user.role === 'coordenador_creche';
  }

  if (pathname === '/lojas/secretaria/relatorio-executivo') {
    return user.role === 'gestora' || user.role === 'comercial';
  }

  if (pathname === '/lojas/secretaria/caixa') {
    return user.role === 'comercial';
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

  if (hasAlbergueRole(user.role, ALBERGUE_READ_ROLES)) {
    return pathname.startsWith('/albergue') || pathname === '/dashboard';
  }

  if (user.role === 'coordenador_creche' || user.role === 'educador_creche') {
    return pathname.startsWith('/escola');
  }

  if (user.role === 'comercial') {
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
