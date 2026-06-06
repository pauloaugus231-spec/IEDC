import { AuthUser } from '../../auth/auth.types';
import { UsuarioRole } from '../../entities/usuario.entity';

export type RelatorioFiltroValor = unknown;
export type RelatorioFiltros = Record<string, RelatorioFiltroValor> & {
  quarto?: string;
  genero?: string;
  lgbt?: boolean;
  cor?: string;
};
export type RelatorioRow = Record<string, string | number | boolean | Date | null | undefined>;
export type SqlParam = string | number | boolean | Date | null;
export type RelatorioExecutivoEscopo = 'institucional' | 'albergue' | 'creche' | 'financeiro';
export type RelatorioExecutivoPeriodo = 'dia' | 'semana' | 'mes' | 'ano';
export type RelatorioExecutivoTone = 'default' | 'success' | 'warning' | 'danger' | 'muted';

export type Relatorio360MetricId =
  | 'pessoas_atendidas'
  | 'acessos_albergue'
  | 'criancas_ativas_eei'
  | 'frequencia_eei'
  | 'vendas_realizadas'
  | 'pendencias_documentais';
export type Relatorio360DimensionId = 'area' | 'periodo' | 'raca_cor' | 'status_documental';
export type Relatorio360ChartType = 'bar' | 'line' | 'table';
export type Relatorio360Confidence = 'completa' | 'parcial' | 'fraca';

export interface Relatorio360Metric {
  id: Relatorio360MetricId;
  label: string;
  description: string;
  format: 'number' | 'currency' | 'percent';
  area: 'institucional' | 'albergue' | 'creche' | 'financeiro';
}

export interface Relatorio360Dimension {
  id: Relatorio360DimensionId;
  label: string;
  description: string;
  sensitive?: boolean;
}

export interface Relatorio360Compatibility {
  metric: Relatorio360MetricId;
  dimensions: Relatorio360DimensionId[];
  chartTypes: Relatorio360ChartType[];
  defaultDimension: Relatorio360DimensionId;
  defaultChart: Relatorio360ChartType;
  note: string;
}

export interface Relatorio360ChartRow {
  key: string;
  label: string;
  value: number;
  area?: string;
  category?: string;
  detail?: string;
  source?: string;
  confidence?: Relatorio360Confidence;
  tone?: RelatorioExecutivoTone;
}

export interface Relatorio360DrilldownRow {
  label: string;
  value: number | string;
  detail?: string;
  tone?: RelatorioExecutivoTone;
  format?: 'number' | 'currency' | 'percent';
}

export interface PeriodoExecutivo {
  escopo: RelatorioExecutivoPeriodo;
  inicio: string;
  fim: string;
  label: string;
}

export interface RelatorioExecutivoKpi {
  id: string;
  label: string;
  value: number | string;
  detail: string;
  tone?: RelatorioExecutivoTone;
  format?: 'number' | 'currency' | 'percent';
}

export interface RelatorioExecutivoAlerta {
  id: string;
  area: 'albergue' | 'creche' | 'financeiro';
  title: string;
  description: string;
  tone: RelatorioExecutivoTone;
  href: string;
  actionLabel: string;
}

export interface RelatorioExecutivoServico {
  id: 'albergue' | 'creche' | 'financeiro';
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

export interface RelatorioGestao360Response {
  scope: 'gestao360';
  generatedAt: string;
  period: PeriodoExecutivo;
  catalog: {
    metrics: Relatorio360Metric[];
    dimensions: Relatorio360Dimension[];
    compatibility: Relatorio360Compatibility[];
  };
  selection: {
    metric: Relatorio360Metric;
    dimension: Relatorio360Dimension;
    chartType: Relatorio360ChartType;
    title: string;
    subtitle: string;
    guardrail: string;
  };
  kpis: RelatorioExecutivoKpi[];
  chart: {
    type: Relatorio360ChartType;
    rows: Relatorio360ChartRow[];
    emptyState: string;
  };
  exports: Array<{
    id: string;
    label: string;
    description: string;
    status: 'disponivel' | 'planejado';
  }>;
}

export interface RelatorioGestao360DrilldownResponse {
  scope: 'gestao360-drilldown';
  generatedAt: string;
  period: PeriodoExecutivo;
  selection: {
    metric: Relatorio360Metric;
    dimension: Relatorio360Dimension;
    key: string;
    label: string;
    title: string;
    summary: string;
    guardrail: string;
    actionLabel: string;
  };
  kpis: RelatorioExecutivoKpi[];
  rows: Relatorio360DrilldownRow[];
  source: {
    area: string;
    base: string;
    confidence: Relatorio360Confidence;
  };
}

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

export interface FaixaEtariaRow {
  faixa: string;
  total: number | string;
}

export interface PdfAutoTableOptions {
  head: string[][];
  body: string[][];
  startY: number;
}

export interface PdfWithAutoTable {
  autoTable(options: PdfAutoTableOptions): void;
}

export const RELATORIO_360_METRICS: Relatorio360Metric[] = [
  {
    id: 'pessoas_atendidas',
    label: 'Cadastros Albergue',
    description: 'Cadastros com passagem pelo Albergue no período selecionado.',
    format: 'number',
    area: 'albergue',
  },
  {
    id: 'acessos_albergue',
    label: 'Acessos do Albergue',
    description: 'Check-ins registrados no Albergue no período selecionado.',
    format: 'number',
    area: 'albergue',
  },
  {
    id: 'criancas_ativas_eei',
    label: 'Crianças ativas',
    description: 'Crianças com status ativo na E.E.I. Casa do Pequenino.',
    format: 'number',
    area: 'creche',
  },
  {
    id: 'frequencia_eei',
    label: 'Frequência da E.E.I.',
    description: 'Percentual de presenças sobre registros lançados na E.E.I.',
    format: 'percent',
    area: 'creche',
  },
  {
    id: 'vendas_realizadas',
    label: 'Vendas realizadas',
    description: 'Pagamentos efetivados nas lojas no período selecionado.',
    format: 'currency',
    area: 'financeiro',
  },
  {
    id: 'pendencias_documentais',
    label: 'Pendências de base',
    description: 'Pendências documentais e operacionais que enfraquecem relatório, gestão e prestação de contas.',
    format: 'number',
    area: 'institucional',
  },
];

export const RELATORIO_360_DIMENSIONS: Relatorio360Dimension[] = [
  {
    id: 'area',
    label: 'Área',
    description: 'Compara blocos institucionais sem misturar bases de naturezas diferentes.',
  },
  {
    id: 'periodo',
    label: 'Período',
    description: 'Mostra evolução temporal da métrica no intervalo selecionado.',
  },
  {
    id: 'raca_cor',
    label: 'Raça/cor',
    description: 'Recorte social agregado, útil para editais, impacto e equidade institucional.',
    sensitive: true,
  },
  {
    id: 'status_documental',
    label: 'Tipo de pendência',
    description: 'Separa pendências por natureza para priorizar correções.',
  },
];

export const RELATORIO_360_COMPATIBILITY: Relatorio360Compatibility[] = [
  {
    metric: 'pessoas_atendidas',
    dimensions: ['periodo', 'raca_cor'],
    chartTypes: ['bar', 'line', 'table'],
    defaultDimension: 'periodo',
    defaultChart: 'line',
    note: 'Mostra cadastros do Albergue por fluxo de acesso ou raça/cor, sem abertura nominal.',
  },
  {
    metric: 'acessos_albergue',
    dimensions: ['periodo', 'raca_cor'],
    chartTypes: ['bar', 'line', 'table'],
    defaultDimension: 'periodo',
    defaultChart: 'line',
    note: 'Acessos representam fluxo de check-in do Albergue, não total de cadastros.',
  },
  {
    metric: 'criancas_ativas_eei',
    dimensions: ['raca_cor'],
    chartTypes: ['bar', 'table'],
    defaultDimension: 'raca_cor',
    defaultChart: 'bar',
    note: 'Crianças ativas são uma fotografia da base atual da E.E.I.',
  },
  {
    metric: 'frequencia_eei',
    dimensions: ['periodo'],
    chartTypes: ['line', 'bar', 'table'],
    defaultDimension: 'periodo',
    defaultChart: 'line',
    note: 'Frequência depende de registros lançados; ausência de lançamento reduz confiabilidade.',
  },
  {
    metric: 'vendas_realizadas',
    dimensions: ['periodo'],
    chartTypes: ['line', 'bar', 'table'],
    defaultDimension: 'periodo',
    defaultChart: 'line',
    note: 'Vendas realizadas usam pagamentos efetivados, não comandas abertas.',
  },
  {
    metric: 'pendencias_documentais',
    dimensions: ['area', 'status_documental'],
    chartTypes: ['bar', 'table'],
    defaultDimension: 'area',
    defaultChart: 'bar',
    note: 'Pendências consolidam dados que prejudicam leitura executiva e prestação de contas.',
  },
];

export function getExecutivePeriod(value?: string): PeriodoExecutivo {
  const escopo: RelatorioExecutivoPeriodo =
    value === 'dia' || value === 'semana' || value === 'ano' ? value : 'mes';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const inicio = new Date(hoje);
  const fim = new Date(hoje);

  if (escopo === 'dia') {
    fim.setDate(hoje.getDate() + 1);
  } else if (escopo === 'semana') {
    inicio.setDate(hoje.getDate() - 6);
    fim.setDate(hoje.getDate() + 1);
  } else if (escopo === 'ano') {
    inicio.setMonth(0, 1);
    fim.setFullYear(hoje.getFullYear() + 1, 0, 1);
  } else {
    inicio.setDate(1);
    fim.setMonth(hoje.getMonth() + 1, 1);
  }

  const labels: Record<RelatorioExecutivoPeriodo, string> = {
    dia: 'Hoje',
    semana: 'Últimos 7 dias',
    mes: 'Mês atual',
    ano: 'Ano atual',
  };

  return {
    escopo,
    inicio: formatDateShared(inicio),
    fim: formatDateShared(fim),
    label: labels[escopo],
  };
}

export function formatDateShared(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function racaCorSql(field: string) {
  return `
    CASE
      WHEN ${field} IS NULL OR btrim(${field}) = '' THEN 'Não informado'
      WHEN lower(${field}) LIKE '%branc%' THEN 'Branca'
      WHEN lower(${field}) LIKE '%pard%' THEN 'Parda'
      WHEN lower(${field}) LIKE '%pret%' THEN 'Preta'
      WHEN lower(${field}) LIKE '%negr%' THEN 'Negra'
      WHEN lower(${field}) LIKE '%indigen%' OR lower(${field}) LIKE '%indígen%' THEN 'Indígena'
      WHEN lower(${field}) LIKE '%amarel%' THEN 'Amarela'
      ELSE ${field}
    END
  `;
}

export async function countSingle(
  dataSource: { query: (q: string, p?: SqlParam[]) => Promise<Array<Record<string, unknown>>> },
  query: string,
  parameters: SqlParam[] = [],
): Promise<number> {
  try {
    const rows = await dataSource.query(query, parameters);
    return Number(rows[0]?.total || 0);
  } catch {
    return 0;
  }
}

export function getAllowedExecutiveScopes(actor: AuthUser | undefined): RelatorioExecutivoEscopo[] {
  if (!actor) return [];

  if (actor.role === UsuarioRole.GESTORA || actor.role === UsuarioRole.EQUIPE_TECNICA) {
    return ['institucional', 'albergue', 'creche', 'financeiro'];
  }

  if (actor.role === UsuarioRole.COORDENADOR_ALBERGUE) {
    return ['albergue'];
  }

  if (actor.role === UsuarioRole.COORDENADOR_CRECHE) {
    return ['creche'];
  }

  if (actor.role === UsuarioRole.FINANCEIRO) {
    return ['financeiro'];
  }

  return [];
}
