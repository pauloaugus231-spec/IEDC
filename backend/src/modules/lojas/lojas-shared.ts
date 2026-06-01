export type PeriodoComercial = 'dia' | 'semana' | 'mes' | 'ano';
export type StatusComanda = 'aberta' | 'aguardando_pagamento' | 'paga' | 'desistencia' | 'cancelada' | 'expirada';

export const LOJAS_OFICIAIS = [
  { slug: 'bazar', nome: 'Bazar' },
  { slug: 'brecho', nome: 'Brechó' },
  { slug: 'feirao', nome: 'Feirão' },
] as const;

export interface LojaComercial {
  id: string;
  slug: string;
  nome: string;
}

export interface RetiradaComercial {
  id: string;
  comandaId: string;
  codigo: string;
  comandaStatus: string;
  cliente: string;
  clienteTelefone?: string | null;
  lojaSlug: string;
  loja: string;
  status: string;
  notificadaEm?: string | null;
  retiradaEm?: string | null;
  entreguePor?: string | null;
  observacoes?: string | null;
  total: number;
  itens: number;
}

export interface LojasComandaResumo extends Record<string, unknown> {
  codigo?: string;
  cliente?: string;
  status: string;
  lojas?: string | null;
  total?: number | null;
  pago?: number | null;
  saldo?: number | null;
  motivoStatus?: string | null;
}

export interface ComandaDetalhe extends Record<string, unknown> {
  id: string;
  codigo: string;
  status: StatusComanda | string;
  cliente?: string;
  clienteId?: string;
  total: number;
  pago: number;
  saldo: number;
  itens: unknown[];
  pagamentos: unknown[];
  totaisPorLoja: unknown[];
  retiradasPorLoja: RetiradaComercial[];
  retirada: RetiradaComercial | null;
}

export interface LojaVendaRow {
  codigo: string;
  cliente: string;
  clienteTelefone?: string | null;
  lojaId: string;
  lojaSlug: string;
  loja: string;
  total?: number | string | null;
  itens?: number | string | null;
}

export interface LojasDashboard {
  periodo: ReturnType<typeof periodoRange>;
  kpis: {
    vendasPagas: number;
    comandasPagas: number;
    vendasPrevistas: number;
    comandasAguardando: number;
    desistencias: number;
    valorDesistido: number;
    retiradasPendentes: number;
    retiradasConcluidas: number;
    ticketMedio: number;
    taxaConversao: number;
  };
  porLoja: Array<Record<string, unknown>>;
  porPagamento: Array<Record<string, unknown>>;
  serie: Array<Record<string, unknown>>;
  comandasAguardando: LojasComandaResumo[];
  recentes: LojasComandaResumo[];
}

export type RelatorioFinanceiroDimension = 'periodo' | 'loja' | 'metodo' | 'status';

export interface RelatorioFinanceiroValor {
  label: string;
  value: number;
  format: 'currency' | 'number' | 'percent';
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

export interface RelatorioFinanceiroDrilldown {
  key: string;
  dimension: RelatorioFinanceiroDimension;
  title: string;
  resumo: string;
  valores: RelatorioFinanceiroValor[];
}

export type QueryRunnerLike = {
  query: (query: string, parameters?: unknown[]) => Promise<unknown[]>;
};

export type LojasEventPayload = Record<string, unknown>;

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizePeriodo(periodo?: string): PeriodoComercial {
  if (periodo === 'semana' || periodo === 'semanal') {
    return 'semana';
  }

  if (periodo === 'mes' || periodo === 'mensal') {
    return 'mes';
  }

  if (periodo === 'ano' || periodo === 'anual') {
    return 'ano';
  }

  return 'dia';
}

export function periodoRange(periodo?: string) {
  const escopo = normalizePeriodo(periodo);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const inicio = new Date(hoje);
  const fim = new Date(hoje);

  if (escopo === 'semana') {
    inicio.setDate(hoje.getDate() - 6);
    fim.setDate(hoje.getDate() + 1);
  } else if (escopo === 'mes') {
    inicio.setDate(1);
    fim.setMonth(hoje.getMonth() + 1, 1);
  } else if (escopo === 'ano') {
    inicio.setMonth(0, 1);
    fim.setFullYear(hoje.getFullYear() + 1, 0, 1);
  } else {
    fim.setDate(hoje.getDate() + 1);
  }

  return {
    escopo,
    inicio: formatDate(inicio),
    fim: formatDate(fim),
  };
}

export function asMoney(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
}

export function normalizeCpf(value?: string) {
  return String(value || '').replace(/\D/g, '');
}

export function normalizeStatus(value?: string): StatusComanda {
  const status = String(value || '').trim();
  const valid: StatusComanda[] = [
    'aberta',
    'aguardando_pagamento',
    'paga',
    'desistencia',
    'cancelada',
    'expirada',
  ];

  return valid.includes(status as StatusComanda) ? (status as StatusComanda) : 'aberta';
}

export function labelStatus(status: string) {
  const labels: Record<string, string> = {
    aberta: 'Aberta',
    aguardando_pagamento: 'Aguardando pagamento',
    paga: 'Paga',
    desistencia: 'Desistência',
    cancelada: 'Cancelada',
    expirada: 'Expirada',
  };

  return labels[status] || status;
}

export function formatCurrency(value: unknown) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
