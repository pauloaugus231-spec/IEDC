import { AuthUser } from '../../auth/auth.types';
import { UsuarioRole } from '../../entities/usuario.entity';
import type {
  PeriodoExecutivo,
  RelatorioExecutivoEscopo,
  RelatorioExecutivoKpi,
  RelatorioExecutivoTone,
} from './relatorios-core-types';

export interface AlbergueSnapshot {
  totalVagas: number;
  ocupadas: number;
  checkinsPeriodo: number;
  checkoutsPeriodo: number;
  vencidas: number;
  presencasPendentes: number;
  pessoasUnicasPeriodo: number;
}

export interface CrecheSnapshot {
  totalCriancas: number;
  turmasAtivas: number;
  frequenciaMedia: number;
  semNis: number;
  ingressosPeriodo: number;
  riscoEvasao: number;
}

export interface FinanceiroSnapshot {
  previsto: number;
  realizado: number;
  pendente: number;
  desistencias: number;
  valorDesistido: number;
  retiradasPendentes: number;
  retiradasConcluidas: number;
  comandasPagas: number;
}

export interface RelatorioExecutivoAlerta {
  id: string;
  area: 'albergue' | 'creche' | 'comercial';
  title: string;
  description: string;
  tone: RelatorioExecutivoTone;
  href: string;
  actionLabel: string;
}

export interface RelatorioExecutivoServico {
  id: 'albergue' | 'creche' | 'comercial';
  title: string;
  subtitle: string;
  score: number;
  status: string;
  summary: string;
  href: string;
  kpis: RelatorioExecutivoKpi[];
}

export interface RelatorioExecutivoResponse {
  scope: RelatorioExecutivoEscopo;
  generatedAt: string;
  period: PeriodoExecutivo;
  headline: {
    title: string;
    summary: string;
    status: string;
    score: number;
  };
  kpis: RelatorioExecutivoKpi[];
  services: RelatorioExecutivoServico[];
  alerts: RelatorioExecutivoAlerta[];
  reportBlocks: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    href: string;
  }>;
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getAllowedExecutiveScopes(actor: AuthUser | undefined): RelatorioExecutivoEscopo[] {
  if (!actor) return [];

  if (actor.role === UsuarioRole.GESTORA) {
    return ['institucional', 'albergue', 'creche', 'comercial'];
  }

  if (
    actor.role === UsuarioRole.COORDENADOR_ALBERGUE ||
    actor.role === UsuarioRole.AUXILIAR_COORDENACAO_ALBERGUE ||
    actor.role === UsuarioRole.DIRETOR_ALBERGUE
  ) {
    return ['albergue'];
  }

  if (actor.role === UsuarioRole.COORDENADOR_CRECHE) {
    return ['creche'];
  }

  if (actor.role === UsuarioRole.COMERCIAL) {
    return ['comercial'];
  }

  return [];
}
