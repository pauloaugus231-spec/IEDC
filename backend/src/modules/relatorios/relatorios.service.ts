import { ForbiddenException, Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthUser } from '../../auth/auth.types';
import { UsuarioRole } from '../../entities/usuario.entity';
import { Pessoa } from '../../entities/pessoa.entity';
import { Estadia } from '../../entities/estadia.entity';
import * as ExcelJS from 'exceljs';
import * as jsPDF from 'jspdf';
import 'jspdf-autotable';

type RelatorioFiltroValor = unknown;
export type RelatorioFiltros = Record<string, RelatorioFiltroValor> & {
  quarto?: string;
  genero?: string;
  lgbt?: boolean;
  cor?: string;
};
type RelatorioRow = Record<string, string | number | boolean | Date | null | undefined>;
type SqlParam = string | number | boolean | Date | null;
export type RelatorioExecutivoEscopo = 'institucional' | 'albergue' | 'creche' | 'financeiro';
type RelatorioExecutivoPeriodo = 'dia' | 'semana' | 'mes' | 'ano';
type RelatorioExecutivoTone = 'default' | 'success' | 'warning' | 'danger' | 'muted';
type Relatorio360MetricId =
  | 'pessoas_atendidas'
  | 'acessos_albergue'
  | 'criancas_ativas_eei'
  | 'frequencia_eei'
  | 'vendas_realizadas'
  | 'pendencias_documentais';
type Relatorio360DimensionId = 'area' | 'periodo' | 'raca_cor' | 'status_documental';
type Relatorio360ChartType = 'bar' | 'line' | 'table';
type Relatorio360Confidence = 'completa' | 'parcial' | 'fraca';

interface Relatorio360Metric {
  id: Relatorio360MetricId;
  label: string;
  description: string;
  format: 'number' | 'currency' | 'percent';
  area: 'institucional' | 'albergue' | 'creche' | 'financeiro';
}

interface Relatorio360Dimension {
  id: Relatorio360DimensionId;
  label: string;
  description: string;
  sensitive?: boolean;
}

interface Relatorio360Compatibility {
  metric: Relatorio360MetricId;
  dimensions: Relatorio360DimensionId[];
  chartTypes: Relatorio360ChartType[];
  defaultDimension: Relatorio360DimensionId;
  defaultChart: Relatorio360ChartType;
  note: string;
}

interface Relatorio360ChartRow {
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

interface Relatorio360DrilldownRow {
  label: string;
  value: number | string;
  detail?: string;
  tone?: RelatorioExecutivoTone;
  format?: 'number' | 'currency' | 'percent';
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

const RELATORIO_360_METRICS: Relatorio360Metric[] = [
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

const RELATORIO_360_DIMENSIONS: Relatorio360Dimension[] = [
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

const RELATORIO_360_COMPATIBILITY: Relatorio360Compatibility[] = [
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

interface PeriodoExecutivo {
  escopo: RelatorioExecutivoPeriodo;
  inicio: string;
  fim: string;
  label: string;
}

interface RelatorioExecutivoKpi {
  id: string;
  label: string;
  value: number | string;
  detail: string;
  tone?: RelatorioExecutivoTone;
  format?: 'number' | 'currency' | 'percent';
}

interface RelatorioExecutivoAlerta {
  id: string;
  area: 'albergue' | 'creche' | 'financeiro';
  title: string;
  description: string;
  tone: RelatorioExecutivoTone;
  href: string;
  actionLabel: string;
}

interface RelatorioExecutivoServico {
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

interface AlbergueSnapshot {
  totalVagas: number;
  ocupadas: number;
  checkinsPeriodo: number;
  checkoutsPeriodo: number;
  vencidas: number;
  presencasPendentes: number;
  pessoasUnicasPeriodo: number;
}

interface CrecheSnapshot {
  totalCriancas: number;
  turmasAtivas: number;
  frequenciaMedia: number;
  semNis: number;
  ingressosPeriodo: number;
  riscoEvasao: number;
}

interface FinanceiroSnapshot {
  previsto: number;
  realizado: number;
  pendente: number;
  desistencias: number;
  valorDesistido: number;
  retiradasPendentes: number;
  retiradasConcluidas: number;
  comandasPagas: number;
}

interface FaixaEtariaRow {
  faixa: string;
  total: number | string;
}

interface PdfAutoTableOptions {
  head: string[][];
  body: string[][];
  startY: number;
}

interface PdfWithAutoTable {
  autoTable(options: PdfAutoTableOptions): void;
}

@Injectable()
export class RelatoriosService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Pessoa)
    private pessoaRepository: Repository<Pessoa>,
    @InjectRepository(Estadia)
    private estadiaRepository: Repository<Estadia>,
  ) {}

  async getRelatorioExecutivo(
    actor: AuthUser | undefined,
    escopo?: string,
    periodo?: string,
  ): Promise<RelatorioExecutivoResponse> {
    const scope = this.resolveExecutiveScope(actor, escopo);
    const period = this.getExecutivePeriod(periodo);
    const needsAlbergue = scope === 'institucional' || scope === 'albergue';
    const needsCreche = scope === 'institucional' || scope === 'creche';
    const needsFinanceiro = scope === 'institucional' || scope === 'financeiro';

    const [albergue, creche, financeiro] = await Promise.all([
      needsAlbergue ? this.getAlbergueSnapshot(period) : Promise.resolve(null),
      needsCreche ? this.getCrecheSnapshot(period) : Promise.resolve(null),
      needsFinanceiro ? this.getFinanceiroSnapshot(period) : Promise.resolve(null),
    ]);

    const services = [
      albergue ? this.buildAlbergueService(albergue) : null,
      creche ? this.buildCrecheService(creche) : null,
      financeiro ? this.buildFinanceiroService(financeiro) : null,
    ].filter((item): item is RelatorioExecutivoServico => Boolean(item));

    const alerts = [
      ...(albergue ? this.buildAlbergueAlerts(albergue) : []),
      ...(creche ? this.buildCrecheAlerts(creche) : []),
      ...(financeiro ? this.buildFinanceiroAlerts(financeiro) : []),
    ];

    const kpis = this.buildExecutiveKpis(scope, albergue, creche, financeiro);
    const score = services.length
      ? Math.round(services.reduce((sum, service) => sum + service.score, 0) / services.length)
      : 0;

    return {
      scope,
      generatedAt: new Date().toISOString(),
      period,
      headline: {
        title: this.getExecutiveTitle(scope),
        summary: this.getExecutiveSummary(scope),
        status: alerts.some((alert) => alert.tone === 'danger') ? 'Exige decisão' : alerts.length ? 'Atenção operacional' : 'Em ordem',
        score,
      },
      kpis,
      services,
      alerts,
      reportBlocks: this.buildReportBlocks(scope),
    };
  }

  async getRelatorioGestao360(
    actor: AuthUser | undefined,
    periodo?: string,
    metricId?: string,
    dimensionId?: string,
    chartType?: string,
  ): Promise<RelatorioGestao360Response> {
    this.ensureGestao360Access(actor);

    const period = this.getExecutivePeriod(periodo);
    const metric = this.resolve360Metric(metricId);
    const compatibility = this.get360Compatibility(metric.id);
    const dimension = this.resolve360Dimension(dimensionId, compatibility);
    const chart = this.resolve360ChartType(chartType, compatibility);

    const [kpis, rows] = await Promise.all([
      this.get360Kpis(period),
      this.get360ChartRows(metric.id, dimension.id, period),
    ]);

    return {
      scope: 'gestao360',
      generatedAt: new Date().toISOString(),
      period,
      catalog: {
        metrics: RELATORIO_360_METRICS,
        dimensions: RELATORIO_360_DIMENSIONS,
        compatibility: RELATORIO_360_COMPATIBILITY,
      },
      selection: {
        metric,
        dimension,
        chartType: chart,
        title: `${metric.label} por ${dimension.label.toLowerCase()}`,
        subtitle: `${metric.description} ${compatibility.note}`,
        guardrail: dimension.sensitive
          ? 'Recorte sensível: exibição agregada, sem abertura nominal, para proteger pessoas e evitar leitura indevida.'
          : compatibility.note,
      },
      kpis,
      chart: {
        type: chart,
        rows,
        emptyState: 'Sem dados suficientes para a seleção atual.',
      },
      exports: [
        {
          id: 'csv-visao-atual',
          label: 'Exportar visão atual',
          description: 'Baixa os dados exibidos nesta composição em tabela compatível com planilhas.',
          status: 'disponivel',
        },
        {
          id: 'pdf-institucional',
          label: 'PDF institucional',
          description: 'Modelo oficial com capa, resumo executivo, gráficos e leitura por área.',
          status: 'planejado',
        },
        {
          id: 'excel-analitico',
          label: 'Excel analítico',
          description: 'Pacote com abas por área, indicadores, recortes e qualidade de dados.',
          status: 'planejado',
        },
      ],
    };
  }

  async getRelatorioGestao360Drilldown(
    actor: AuthUser | undefined,
    periodo?: string,
    metricId?: string,
    dimensionId?: string,
    key?: string,
  ): Promise<RelatorioGestao360DrilldownResponse> {
    this.ensureGestao360Access(actor);

    const period = this.getExecutivePeriod(periodo);
    const metric = this.resolve360Metric(metricId);
    const compatibility = this.get360Compatibility(metric.id);
    const dimension = this.resolve360Dimension(dimensionId, compatibility);
    const rows = await this.get360ChartRows(metric.id, dimension.id, period);
    const selected = rows.find((row) => row.key === key) || rows[0] || {
      key: key || 'sem-dados',
      label: 'Sem dados',
      value: 0,
      source: this.get360MetricSource(metric),
      confidence: 'fraca' as Relatorio360Confidence,
    };
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    const share = total ? Math.round((selected.value / total) * 100) : 0;
    const guardrail = dimension.sensitive
      ? 'Recorte sensível: leitura agregada, sem nomes ou dados individuais.'
      : compatibility.note;

    return {
      scope: 'gestao360-drilldown',
      generatedAt: new Date().toISOString(),
      period,
      selection: {
        metric,
        dimension,
        key: selected.key,
        label: selected.label,
        title: `${selected.label}: ${metric.label}`,
        summary: this.get360DrilldownSummary(metric, dimension, selected, share),
        guardrail,
        actionLabel: this.get360DrilldownAction(metric.id),
      },
      kpis: [
        {
          id: 'valor-selecionado',
          label: 'Valor selecionado',
          value: selected.value,
          detail: selected.detail || selected.source || this.get360MetricSource(metric),
          format: metric.format,
        },
        {
          id: 'participacao',
          label: 'Participação na visão',
          value: share,
          detail: `${selected.value} de ${total || 0} no recorte atual`,
          format: 'percent',
          tone: share >= 50 ? 'success' : 'default',
        },
        {
          id: 'linhas-visao',
          label: 'Linhas comparadas',
          value: rows.length,
          detail: 'Quantidade de pontos nesta composição',
          tone: rows.length ? 'default' : 'warning',
        },
      ],
      rows: this.get360DrilldownRows(metric, dimension, selected, rows, share),
      source: {
        area: selected.area || selected.source || this.get360MetricSource(metric),
        base: this.get360MetricSource(metric),
        confidence: selected.confidence || 'parcial',
      },
    };
  }

  private resolveExecutiveScope(actor: AuthUser | undefined, escopo?: string): RelatorioExecutivoEscopo {
    const allowed = this.getAllowedExecutiveScopes(actor);
    const requested = this.normalizeExecutiveScope(escopo) || allowed[0];

    if (!requested || !allowed.includes(requested)) {
      throw new ForbiddenException('Este perfil não acessa este relatório executivo.');
    }

    return requested;
  }

  private getAllowedExecutiveScopes(actor: AuthUser | undefined): RelatorioExecutivoEscopo[] {
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

  private normalizeExecutiveScope(value?: string): RelatorioExecutivoEscopo | null {
    const scope = String(value || '').trim();
    const valid: RelatorioExecutivoEscopo[] = ['institucional', 'albergue', 'creche', 'financeiro'];
    return valid.includes(scope as RelatorioExecutivoEscopo) ? (scope as RelatorioExecutivoEscopo) : null;
  }

  private getExecutivePeriod(value?: string): PeriodoExecutivo {
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
      inicio: this.formatDate(inicio),
      fim: this.formatDate(fim),
      label: labels[escopo],
    };
  }

  private formatDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async getAlbergueSnapshot(period: PeriodoExecutivo): Promise<AlbergueSnapshot> {
    const [row] = await this.dataSource.query(
      `
        WITH estadias_ativas AS (
          SELECT e.id, e.pessoa_id, e.data_limite
          FROM estadias e
          WHERE e.status = 'ativa'
        ),
        estadias_periodo AS (
          SELECT DISTINCT e.pessoa_id
          FROM estadias e
          WHERE e.data_checkin::date < $2::date
            AND COALESCE(e.data_checkout::date, $2::date) >= $1::date
        )
        SELECT
          (SELECT COUNT(*)::int FROM camas) AS "totalVagas",
          (SELECT COUNT(*)::int FROM estadias_ativas) AS ocupadas,
          (SELECT COUNT(*)::int FROM estadias WHERE data_checkin >= $1::date AND data_checkin < $2::date) AS "checkinsPeriodo",
          (SELECT COUNT(*)::int FROM estadias WHERE data_checkout >= $1::date AND data_checkout < $2::date) AS "checkoutsPeriodo",
          (SELECT COUNT(*)::int FROM estadias_ativas WHERE data_limite::date < CURRENT_DATE) AS vencidas,
          (
            SELECT COUNT(*)::int
            FROM estadias_ativas ea
            JOIN pessoas p ON p.id = ea.pessoa_id
            WHERE p.presente = false
          ) AS "presencasPendentes",
          (SELECT COUNT(*)::int FROM estadias_periodo) AS "pessoasUnicasPeriodo"
      `,
      [period.inicio, period.fim],
    );

    return {
      totalVagas: Number(row?.totalVagas || 0),
      ocupadas: Number(row?.ocupadas || 0),
      checkinsPeriodo: Number(row?.checkinsPeriodo || 0),
      checkoutsPeriodo: Number(row?.checkoutsPeriodo || 0),
      vencidas: Number(row?.vencidas || 0),
      presencasPendentes: Number(row?.presencasPendentes || 0),
      pessoasUnicasPeriodo: Number(row?.pessoasUnicasPeriodo || 0),
    };
  }

  private async getCrecheSnapshot(period: PeriodoExecutivo): Promise<CrecheSnapshot> {
    const [row] = await this.dataSource.query(
      `
        WITH frequencias AS (
          SELECT
            COUNT(*)::int AS total_registros,
            COUNT(*) FILTER (WHERE presente = true)::int AS presentes
          FROM creche_frequencias
          WHERE data >= $1::date AND data < $2::date
        ),
        riscos AS (
          SELECT COUNT(*)::int AS total
          FROM (
            SELECT c.id
            FROM creche_criancas c
            JOIN creche_frequencias f ON f.crianca_id = c.id
            WHERE c.status = 'ativa'
              AND f.data >= $1::date
              AND f.data < $2::date
              AND f.presente = false
            GROUP BY c.id
            HAVING COUNT(*) >= 3
          ) base
        )
        SELECT
          (SELECT COUNT(*)::int FROM creche_criancas WHERE status = 'ativa') AS "totalCriancas",
          (SELECT COUNT(*)::int FROM creche_turmas WHERE ativa = true) AS "turmasAtivas",
          COALESCE(ROUND(100.0 * f.presentes / NULLIF(f.total_registros, 0)), 0)::int AS "frequenciaMedia",
          (
            SELECT COUNT(*)::int
            FROM creche_criancas
            WHERE status = 'ativa'
              AND (nis IS NULL OR btrim(nis) = '')
          ) AS "semNis",
          (
            SELECT COUNT(*)::int
            FROM creche_criancas
            WHERE data_ingresso >= $1::date AND data_ingresso < $2::date
          ) AS "ingressosPeriodo",
          COALESCE(r.total, 0)::int AS "riscoEvasao"
        FROM frequencias f
        CROSS JOIN riscos r
      `,
      [period.inicio, period.fim],
    );

    return {
      totalCriancas: Number(row?.totalCriancas || 0),
      turmasAtivas: Number(row?.turmasAtivas || 0),
      frequenciaMedia: Number(row?.frequenciaMedia || 0),
      semNis: Number(row?.semNis || 0),
      ingressosPeriodo: Number(row?.ingressosPeriodo || 0),
      riscoEvasao: Number(row?.riscoEvasao || 0),
    };
  }

  private async getFinanceiroSnapshot(period: PeriodoExecutivo): Promise<FinanceiroSnapshot> {
    const [row] = await this.dataSource.query(
      `
        WITH totais AS (
          SELECT
            c.id,
            c.status,
            c.updated_at,
            COALESCE(SUM(i.total_item), 0)::numeric(12,2) AS total_itens
          FROM comercio_comandas c
          LEFT JOIN comercio_comanda_itens i ON i.comanda_id = c.id
          GROUP BY c.id
        ),
        pagos AS (
          SELECT
            comanda_id,
            SUM(valor)::numeric(12,2) AS total_pago
          FROM comercio_pagamentos
          GROUP BY comanda_id
        ),
        pagamentos_periodo AS (
          SELECT
            COALESCE(SUM(valor), 0)::numeric(12,2) AS realizado,
            COUNT(DISTINCT comanda_id)::int AS comandas_pagas
          FROM comercio_pagamentos
          WHERE created_at >= $1::date AND created_at < $2::date
        ),
        abertas AS (
          SELECT
            COALESCE(SUM(t.total_itens), 0)::numeric(12,2) AS previsto,
            COALESCE(SUM(GREATEST(t.total_itens - COALESCE(p.total_pago, 0), 0)), 0)::numeric(12,2) AS pendente
          FROM totais t
          LEFT JOIN pagos p ON p.comanda_id = t.id
          WHERE t.status IN ('aberta', 'aguardando_pagamento')
        ),
        desistencias AS (
          SELECT
            COUNT(*)::int AS desistencias,
            COALESCE(SUM(total_itens), 0)::numeric(12,2) AS valor_desistido
          FROM totais
          WHERE status = 'desistencia'
            AND updated_at >= $1::date
            AND updated_at < $2::date
        ),
        retiradas AS (
          SELECT
            COUNT(*) FILTER (WHERE status = 'aguardando_retirada')::int AS retiradas_pendentes,
            COUNT(*) FILTER (
              WHERE status = 'retirado'
                AND retirada_em >= $1::date
                AND retirada_em < $2::date
            )::int AS retiradas_concluidas
          FROM comercio_retiradas
        )
        SELECT
          COALESCE(a.previsto, 0)::float AS previsto,
          COALESCE(p.realizado, 0)::float AS realizado,
          COALESCE(a.pendente, 0)::float AS pendente,
          COALESCE(d.desistencias, 0)::int AS desistencias,
          COALESCE(d.valor_desistido, 0)::float AS "valorDesistido",
          COALESCE(r.retiradas_pendentes, 0)::int AS "retiradasPendentes",
          COALESCE(r.retiradas_concluidas, 0)::int AS "retiradasConcluidas",
          COALESCE(p.comandas_pagas, 0)::int AS "comandasPagas"
        FROM pagamentos_periodo p
        CROSS JOIN abertas a
        CROSS JOIN desistencias d
        CROSS JOIN retiradas r
      `,
      [period.inicio, period.fim],
    );

    return {
      previsto: Number(row?.previsto || 0),
      realizado: Number(row?.realizado || 0),
      pendente: Number(row?.pendente || 0),
      desistencias: Number(row?.desistencias || 0),
      valorDesistido: Number(row?.valorDesistido || 0),
      retiradasPendentes: Number(row?.retiradasPendentes || 0),
      retiradasConcluidas: Number(row?.retiradasConcluidas || 0),
      comandasPagas: Number(row?.comandasPagas || 0),
    };
  }

  private buildAlbergueService(data: AlbergueSnapshot): RelatorioExecutivoServico {
    const ocupacaoPercentual = data.totalVagas ? Math.round((data.ocupadas / data.totalVagas) * 100) : 0;
    const score = this.clampScore(100 - data.vencidas * 12 - data.presencasPendentes * 4);

    return {
      id: 'albergue',
      title: 'Albergue Noturno',
      subtitle: 'Acolhimento e permanência',
      score,
      status: data.vencidas ? 'Regularizar permanências' : data.presencasPendentes ? 'Conferir presença' : 'Operação estável',
      summary: `${data.ocupadas} pessoas acolhidas agora, ${ocupacaoPercentual}% de ocupação e ${data.pessoasUnicasPeriodo} pessoas únicas no período.`,
      href: '/albergue/relatorios',
      kpis: [
        { id: 'ocupacao', label: 'Ocupação', value: ocupacaoPercentual, detail: `${data.ocupadas} de ${data.totalVagas} camas`, format: 'percent' },
        { id: 'acessos', label: 'Pessoas únicas', value: data.pessoasUnicasPeriodo, detail: 'Circularam no período' },
        { id: 'checkins', label: 'Entradas', value: data.checkinsPeriodo, detail: 'Check-ins no período', tone: 'success' },
        { id: 'vencidas', label: 'Permanências vencidas', value: data.vencidas, detail: 'Exigem decisão de saída ou prorrogação', tone: data.vencidas ? 'danger' : 'success' },
      ],
    };
  }

  private buildCrecheService(data: CrecheSnapshot): RelatorioExecutivoServico {
    const score = this.clampScore(100 - data.semNis * 5 - data.riscoEvasao * 8 - Math.max(0, 85 - data.frequenciaMedia));

    return {
      id: 'creche',
      title: 'E.E.I. Casa do Pequenino',
      subtitle: 'Educação infantil',
      score,
      status: data.riscoEvasao ? 'Acompanhar frequência' : data.semNis ? 'Completar aferição' : 'Base consistente',
      summary: `${data.totalCriancas} crianças ativas, ${data.turmasAtivas} turmas e ${data.frequenciaMedia}% de frequência média no período.`,
      href: '/creche/relatorios',
      kpis: [
        { id: 'criancas', label: 'Crianças ativas', value: data.totalCriancas, detail: `${data.turmasAtivas} turmas ativas` },
        { id: 'frequencia', label: 'Frequência média', value: data.frequenciaMedia, detail: 'Registros do período', format: 'percent', tone: data.frequenciaMedia >= 85 ? 'success' : 'warning' },
        { id: 'sem-nis', label: 'Pendências NIS', value: data.semNis, detail: 'Afetam aferição e prestação de contas', tone: data.semNis ? 'warning' : 'success' },
        { id: 'risco', label: 'Risco de evasão', value: data.riscoEvasao, detail: 'Três ou mais faltas no período', tone: data.riscoEvasao ? 'danger' : 'success' },
      ],
    };
  }

  private buildFinanceiroService(data: FinanceiroSnapshot): RelatorioExecutivoServico {
    const score = this.clampScore(100 - data.retiradasPendentes * 5 - data.desistencias * 4 - Math.min(35, Math.round(data.pendente / 100)));

    return {
      id: 'financeiro',
      title: 'Financeiro comercial',
      subtitle: 'Lojas e comandas',
      score,
      status: data.pendente > 0 ? 'Cobrança pendente' : data.retiradasPendentes ? 'Retirada pendente' : 'Fechamento estável',
      summary: `Realizado no período: R$ ${data.realizado.toFixed(2)}. Pendente em comandas abertas: R$ ${data.pendente.toFixed(2)}.`,
      href: '/lojas/secretaria',
      kpis: [
        { id: 'previsto', label: 'Previsto', value: data.previsto, detail: 'Comandas abertas ou aguardando pagamento', format: 'currency' },
        { id: 'realizado', label: 'Realizado', value: data.realizado, detail: `${data.comandasPagas} comandas pagas no período`, format: 'currency', tone: 'success' },
        { id: 'pendente', label: 'Pendente', value: data.pendente, detail: 'Saldo ainda em aberto', format: 'currency', tone: data.pendente ? 'warning' : 'success' },
        { id: 'retiradas', label: 'Retiradas', value: data.retiradasPendentes, detail: `${data.retiradasConcluidas} concluídas no período`, tone: data.retiradasPendentes ? 'warning' : 'success' },
      ],
    };
  }

  private buildAlbergueAlerts(data: AlbergueSnapshot): RelatorioExecutivoAlerta[] {
    const alerts: RelatorioExecutivoAlerta[] = [];

    if (data.vencidas > 0) {
      alerts.push({
        id: 'albergue-vencidas',
        area: 'albergue',
        title: 'Permanências vencidas',
        description: `${data.vencidas} estadia(s) ultrapassaram o prazo e precisam de decisão registrada.`,
        tone: 'danger',
        href: '/albergue/qualidade-dados',
        actionLabel: 'Ver pendências',
      });
    }

    if (data.presencasPendentes > 0) {
      alerts.push({
        id: 'albergue-presenca',
        area: 'albergue',
        title: 'Presença pendente',
        description: `${data.presencasPendentes} pessoa(s) acolhidas ainda precisam de conferência de presença.`,
        tone: 'warning',
        href: '/albergue/presencas',
        actionLabel: 'Conferir presença',
      });
    }

    return alerts;
  }

  private buildCrecheAlerts(data: CrecheSnapshot): RelatorioExecutivoAlerta[] {
    const alerts: RelatorioExecutivoAlerta[] = [];

    if (data.semNis > 0) {
      alerts.push({
        id: 'creche-nis',
        area: 'creche',
        title: 'Aferição com NIS pendente',
        description: `${data.semNis} criança(s) ativa(s) precisam de NIS para qualificar relatório e prestação de contas.`,
        tone: 'warning',
        href: '/creche/qualidade-dados',
        actionLabel: 'Revisar base',
      });
    }

    if (data.riscoEvasao > 0) {
      alerts.push({
        id: 'creche-evasao',
        area: 'creche',
        title: 'Sinal de evasão escolar',
        description: `${data.riscoEvasao} criança(s) acumulam faltas relevantes no período.`,
        tone: 'danger',
        href: '/creche',
        actionLabel: 'Abrir painel',
      });
    }

    return alerts;
  }

  private buildFinanceiroAlerts(data: FinanceiroSnapshot): RelatorioExecutivoAlerta[] {
    const alerts: RelatorioExecutivoAlerta[] = [];

    if (data.pendente > 0) {
      alerts.push({
        id: 'financeiro-pendente',
        area: 'financeiro',
        title: 'Comandas com valor pendente',
        description: `Há R$ ${data.pendente.toFixed(2)} em saldo aberto para cobrança ou fechamento.`,
        tone: 'warning',
        href: '/lojas/secretaria/fila',
        actionLabel: 'Abrir fila',
      });
    }

    if (data.retiradasPendentes > 0) {
      alerts.push({
        id: 'financeiro-retiradas',
        area: 'financeiro',
        title: 'Retiradas aguardando baixa',
        description: `${data.retiradasPendentes} retirada(s) precisam de confirmação operacional.`,
        tone: 'warning',
        href: '/lojas/secretaria/qualidade-dados',
        actionLabel: 'Ver qualidade',
      });
    }

    return alerts;
  }

  private buildExecutiveKpis(
    scope: RelatorioExecutivoEscopo,
    albergue: AlbergueSnapshot | null,
    creche: CrecheSnapshot | null,
    financeiro: FinanceiroSnapshot | null,
  ): RelatorioExecutivoKpi[] {
    if (scope === 'albergue' && albergue) {
      return this.buildAlbergueService(albergue).kpis;
    }

    if (scope === 'creche' && creche) {
      return this.buildCrecheService(creche).kpis;
    }

    if (scope === 'financeiro' && financeiro) {
      return [
        { id: 'previsto', label: 'Previsto', value: financeiro.previsto, detail: 'Comandas abertas ou aguardando pagamento', format: 'currency' },
        { id: 'realizado', label: 'Realizado', value: financeiro.realizado, detail: `${financeiro.comandasPagas} comandas pagas`, format: 'currency', tone: 'success' },
        { id: 'pendente', label: 'Pendente', value: financeiro.pendente, detail: 'Saldo em aberto', format: 'currency', tone: financeiro.pendente ? 'warning' : 'success' },
        { id: 'desistencias', label: 'Desistências', value: financeiro.valorDesistido, detail: `${financeiro.desistencias} comanda(s) encerradas como desistência`, format: 'currency', tone: financeiro.desistencias ? 'warning' : 'muted' },
        { id: 'retiradas', label: 'Retiradas pendentes', value: financeiro.retiradasPendentes, detail: `${financeiro.retiradasConcluidas} concluídas`, tone: financeiro.retiradasPendentes ? 'warning' : 'success' },
      ];
    }

    return [
      { id: 'pessoas', label: 'Cadastros Albergue', value: albergue?.pessoasUnicasPeriodo || 0, detail: 'Cadastros com passagem no período' },
      { id: 'ocupacao', label: 'Ocupação albergue', value: albergue?.totalVagas ? Math.round((albergue.ocupadas / albergue.totalVagas) * 100) : 0, detail: `${albergue?.ocupadas || 0} pessoas acolhidas agora`, format: 'percent' },
      { id: 'frequencia', label: 'Frequência E.E.I.', value: creche?.frequenciaMedia || 0, detail: 'Média no período', format: 'percent', tone: (creche?.frequenciaMedia || 0) >= 85 ? 'success' : 'warning' },
      { id: 'realizado', label: 'Realizado comercial', value: financeiro?.realizado || 0, detail: 'Lojas no período', format: 'currency', tone: 'success' },
      { id: 'pendencias', label: 'Pendências críticas', value: (albergue?.vencidas || 0) + (creche?.riscoEvasao || 0) + (financeiro?.retiradasPendentes || 0), detail: 'Itens que pedem decisão', tone: 'warning' },
    ];
  }

  private buildReportBlocks(scope: RelatorioExecutivoEscopo) {
    const blocks = [
      {
        id: 'albergue',
        title: 'Relatório social do Albergue',
        description: 'Perfil, acesso, ocupação, permanência, recortes e exportação LGPD.',
        status: 'Operacional',
        href: '/albergue/relatorios',
      },
      {
        id: 'creche',
        title: 'Relatório da E.E.I.',
        description: 'Aferição, frequência, NIS, turmas e prestação de contas da educação infantil.',
        status: 'Operacional',
        href: '/creche/relatorios',
      },
      {
        id: 'financeiro',
        title: 'Relatório financeiro comercial',
        description: 'Previsto, realizado, pendente, desistências, retiradas e fechamento das lojas.',
        status: 'Operacional',
        href: '/lojas/secretaria',
      },
    ];

    if (scope === 'institucional') return blocks;
    return blocks.filter((block) => block.id === scope);
  }

  private getExecutiveTitle(scope: RelatorioExecutivoEscopo) {
    const titles: Record<RelatorioExecutivoEscopo, string> = {
      institucional: 'Relatório executivo institucional',
      albergue: 'Relatório executivo do Albergue',
      creche: 'Relatório executivo da E.E.I.',
      financeiro: 'Relatório comercial e financeiro',
    };

    return titles[scope];
  }

  private getExecutiveSummary(scope: RelatorioExecutivoEscopo) {
    const summaries: Record<RelatorioExecutivoEscopo, string> = {
      institucional: 'Leitura consolidada para gestão: operação social, educação infantil, financeiro comercial e alertas que exigem decisão.',
      albergue: 'Leitura gerencial do acolhimento: ocupação, fluxo do período, presença e permanências que exigem providência.',
      creche: 'Leitura da E.E.I.: crianças ativas, frequência, aferição, documentação e sinais de acompanhamento.',
      financeiro: 'Leitura comercial das lojas: previsto, realizado, pendente, desistências e retiradas.',
    };

    return summaries[scope];
  }

  private clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private ensureGestao360Access(actor: AuthUser | undefined) {
    if (!actor || (actor.role !== UsuarioRole.GESTORA && actor.role !== UsuarioRole.EQUIPE_TECNICA)) {
      throw new ForbiddenException('Este perfil não acessa o Explorador Institucional 360.');
    }
  }

  private resolve360Metric(value?: string): Relatorio360Metric {
    const found = RELATORIO_360_METRICS.find((metric) => metric.id === value);
    return found || RELATORIO_360_METRICS[0];
  }

  private get360Compatibility(metric: Relatorio360MetricId): Relatorio360Compatibility {
    const found = RELATORIO_360_COMPATIBILITY.find((item) => item.metric === metric);

    if (!found) {
      return RELATORIO_360_COMPATIBILITY[0];
    }

    return found;
  }

  private resolve360Dimension(
    value: string | undefined,
    compatibility: Relatorio360Compatibility,
  ): Relatorio360Dimension {
    const dimensionId = compatibility.dimensions.includes(value as Relatorio360DimensionId)
      ? (value as Relatorio360DimensionId)
      : compatibility.defaultDimension;
    const found = RELATORIO_360_DIMENSIONS.find((dimension) => dimension.id === dimensionId);
    return found || RELATORIO_360_DIMENSIONS[0];
  }

  private resolve360ChartType(
    value: string | undefined,
    compatibility: Relatorio360Compatibility,
  ): Relatorio360ChartType {
    return compatibility.chartTypes.includes(value as Relatorio360ChartType)
      ? (value as Relatorio360ChartType)
      : compatibility.defaultChart;
  }

  private async get360Kpis(period: PeriodoExecutivo): Promise<RelatorioExecutivoKpi[]> {
    const [
      alberguePessoas,
      acessosAlbergue,
      frequenciaEei,
      vendasRealizadas,
      pendencias,
    ] = await Promise.all([
      this.countSingle(`
        SELECT COUNT(DISTINCT e.pessoa_id)::int AS total
        FROM estadias e
        WHERE e.data_checkin::date < $2::date
          AND COALESCE(e.data_checkout::date, $2::date) >= $1::date
      `, [period.inicio, period.fim]),
      this.countSingle(`
        SELECT COUNT(*)::int AS total
        FROM estadias
        WHERE data_checkin >= $1::date AND data_checkin < $2::date
      `, [period.inicio, period.fim]),
      this.countSingle(`
        SELECT COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE presente) / NULLIF(COUNT(*), 0)), 0)::int AS total
        FROM creche_frequencias
        WHERE data >= $1::date AND data < $2::date
      `, [period.inicio, period.fim]),
      this.countSingle(`
        SELECT COALESCE(SUM(valor), 0)::float AS total
        FROM comercio_pagamentos
        WHERE created_at >= $1::date AND created_at < $2::date
      `, [period.inicio, period.fim]),
      this.get360QualityTotal(),
    ]);

    return [
      {
        id: 'pessoas-atendidas',
        label: 'Cadastros Albergue',
        value: alberguePessoas,
        detail: 'Cadastros com passagem no período selecionado',
      },
      {
        id: 'acessos-albergue',
        label: 'Acessos Albergue',
        value: acessosAlbergue,
        detail: 'Check-ins no período selecionado',
      },
      {
        id: 'frequencia-eei',
        label: 'Frequência E.E.I.',
        value: frequenciaEei,
        detail: 'Presenças sobre registros lançados',
        format: 'percent',
        tone: frequenciaEei >= 85 ? 'success' : 'warning',
      },
      {
        id: 'vendas-realizadas',
        label: 'Realizado comercial',
        value: vendasRealizadas,
        detail: 'Pagamentos efetivados nas lojas',
        format: 'currency',
        tone: 'success',
      },
      {
        id: 'pendencias-base',
        label: 'Pendências de base',
        value: pendencias,
        detail: 'Registros que enfraquecem relatório ou operação',
        tone: pendencias ? 'warning' : 'success',
      },
    ];
  }

  private async get360ChartRows(
    metric: Relatorio360MetricId,
    dimension: Relatorio360DimensionId,
    period: PeriodoExecutivo,
  ): Promise<Relatorio360ChartRow[]> {
    if (metric === 'pessoas_atendidas' && dimension === 'periodo') {
      return this.get360CadastrosAlberguePorPeriodo(period);
    }

    if (metric === 'pessoas_atendidas' && dimension === 'raca_cor') {
      return this.get360PessoasPorRacaCor(period);
    }

    if (metric === 'acessos_albergue' && dimension === 'periodo') {
      return this.get360AcessosAlberguePorPeriodo(period);
    }

    if (metric === 'acessos_albergue' && dimension === 'raca_cor') {
      return this.get360AcessosAlberguePorRacaCor(period);
    }

    if (metric === 'criancas_ativas_eei' && dimension === 'raca_cor') {
      return this.get360CriancasPorRacaCor();
    }

    if (metric === 'frequencia_eei' && dimension === 'periodo') {
      return this.get360FrequenciaPorPeriodo(period);
    }

    if (metric === 'vendas_realizadas' && dimension === 'periodo') {
      return this.get360VendasPorPeriodo(period);
    }

    if (metric === 'pendencias_documentais' && dimension === 'area') {
      return this.get360PendenciasPorArea();
    }

    if (metric === 'pendencias_documentais' && dimension === 'status_documental') {
      return this.get360PendenciasPorTipo();
    }

    return [];
  }

  private async get360PessoasPorRacaCor(period: PeriodoExecutivo): Promise<Relatorio360ChartRow[]> {
    return this.map360Rows(await this.dataSource.query(
      `
        SELECT
          ${this.racaCorSql('COALESCE(p.cor, p.raca)')} AS label,
          COUNT(DISTINCT p.id)::int AS value,
          'Albergue' AS area,
          ${this.racaCorSql('COALESCE(p.cor, p.raca)')} AS category
        FROM pessoas p
        JOIN estadias e ON e.pessoa_id = p.id
        WHERE e.data_checkin::date < $2::date
          AND COALESCE(e.data_checkout::date, $2::date) >= $1::date
        GROUP BY ${this.racaCorSql('COALESCE(p.cor, p.raca)')}
        ORDER BY value DESC, label
      `,
      [period.inicio, period.fim],
    ));
  }

  private async get360CadastrosAlberguePorPeriodo(period: PeriodoExecutivo): Promise<Relatorio360ChartRow[]> {
    const bucket = this.get360DateBucket(period);

    return this.map360Rows(await this.dataSource.query(
      `
        SELECT
          to_char(date_trunc('${bucket.unit}', e.data_checkin)::date, '${bucket.labelFormat}') AS label,
          COUNT(DISTINCT e.pessoa_id)::int AS value,
          'Albergue' AS area
        FROM estadias e
        WHERE e.data_checkin >= $1::date AND e.data_checkin < $2::date
        GROUP BY date_trunc('${bucket.unit}', e.data_checkin)::date
        ORDER BY date_trunc('${bucket.unit}', e.data_checkin)::date
      `,
      [period.inicio, period.fim],
    ));
  }

  private async get360AcessosAlberguePorPeriodo(period: PeriodoExecutivo): Promise<Relatorio360ChartRow[]> {
    const bucket = this.get360DateBucket(period);

    return this.map360Rows(await this.dataSource.query(
      `
        WITH pontos AS (
          SELECT date_trunc('${bucket.unit}', data_checkin)::date AS bucket, COUNT(*)::int AS total
          FROM estadias
          WHERE data_checkin >= $1::date AND data_checkin < $2::date
          GROUP BY date_trunc('${bucket.unit}', data_checkin)::date
        )
        SELECT to_char(bucket, '${bucket.labelFormat}') AS label, total AS value, 'Albergue' AS area
        FROM pontos
        ORDER BY bucket
      `,
      [period.inicio, period.fim],
    ));
  }

  private async get360AcessosAlberguePorRacaCor(period: PeriodoExecutivo): Promise<Relatorio360ChartRow[]> {
    return this.map360Rows(await this.dataSource.query(
      `
        SELECT
          ${this.racaCorSql('COALESCE(p.cor, p.raca)')} AS label,
          COUNT(*)::int AS value,
          'Albergue' AS area,
          ${this.racaCorSql('COALESCE(p.cor, p.raca)')} AS category
        FROM estadias e
        JOIN pessoas p ON p.id = e.pessoa_id
        WHERE e.data_checkin >= $1::date AND e.data_checkin < $2::date
        GROUP BY ${this.racaCorSql('COALESCE(p.cor, p.raca)')}
        ORDER BY value DESC, label
      `,
      [period.inicio, period.fim],
    ));
  }

  private async get360CriancasPorRacaCor(): Promise<Relatorio360ChartRow[]> {
    return this.map360Rows(await this.dataSource.query(
      `
        SELECT
          ${this.racaCorSql('raca_cor')} AS label,
          COUNT(*)::int AS value,
          'E.E.I.' AS area,
          ${this.racaCorSql('raca_cor')} AS category
        FROM creche_criancas
        WHERE status = 'ativa'
        GROUP BY ${this.racaCorSql('raca_cor')}
        ORDER BY value DESC, label
      `,
    ));
  }

  private async get360FrequenciaPorPeriodo(period: PeriodoExecutivo): Promise<Relatorio360ChartRow[]> {
    const bucket = this.get360DateBucket(period);

    return this.map360Rows(await this.dataSource.query(
      `
        SELECT
          to_char(date_trunc('${bucket.unit}', data)::date, '${bucket.labelFormat}') AS label,
          COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE presente) / NULLIF(COUNT(*), 0)), 0)::int AS value,
          'E.E.I.' AS area,
          COUNT(*) FILTER (WHERE presente)::int || ' presenças de ' || COUNT(*)::int || ' registros' AS detail
        FROM creche_frequencias
        WHERE data >= $1::date AND data < $2::date
        GROUP BY date_trunc('${bucket.unit}', data)::date
        ORDER BY date_trunc('${bucket.unit}', data)::date
      `,
      [period.inicio, period.fim],
    ));
  }

  private async get360VendasPorPeriodo(period: PeriodoExecutivo): Promise<Relatorio360ChartRow[]> {
    const bucket = this.get360DateBucket(period);

    return this.map360Rows(await this.dataSource.query(
      `
        SELECT
          to_char(date_trunc('${bucket.unit}', created_at)::date, '${bucket.labelFormat}') AS label,
          COALESCE(SUM(valor), 0)::float AS value,
          'Lojas' AS area,
          COUNT(*)::int || ' pagamento(s)' AS detail
        FROM comercio_pagamentos
        WHERE created_at >= $1::date AND created_at < $2::date
        GROUP BY date_trunc('${bucket.unit}', created_at)::date
        ORDER BY date_trunc('${bucket.unit}', created_at)::date
      `,
      [period.inicio, period.fim],
    ));
  }

  private async get360PendenciasPorArea(): Promise<Relatorio360ChartRow[]> {
    const counts = await this.get360QualityCounts();

    return [
      {
        key: 'albergue',
        label: 'Albergue',
        value: counts.albergue,
        area: 'Albergue',
        source: 'Qualidade de dados',
        confidence: 'parcial',
        tone: counts.albergue ? 'warning' : 'success',
      },
      {
        key: 'eei',
        label: 'E.E.I.',
        value: counts.creche,
        area: 'E.E.I.',
        source: 'Qualidade de dados',
        confidence: 'parcial',
        tone: counts.creche ? 'warning' : 'success',
      },
      {
        key: 'lojas',
        label: 'Lojas',
        value: counts.financeiro,
        area: 'Lojas',
        source: 'Qualidade de dados',
        confidence: 'parcial',
        tone: counts.financeiro ? 'warning' : 'success',
      },
    ];
  }

  private async get360PendenciasPorTipo(): Promise<Relatorio360ChartRow[]> {
    const counts = await this.get360QualityBreakdown();

    return counts.map((row) => ({
      key: this.build360RowKey(row.area, row.category),
      label: row.label,
      value: row.value,
      area: row.area,
      category: row.category,
      source: 'Qualidade de dados',
      confidence: 'parcial' as Relatorio360Confidence,
      tone: row.value ? 'warning' : 'success',
    }));
  }

  private async get360QualityTotal(): Promise<number> {
    const counts = await this.get360QualityCounts();
    return counts.albergue + counts.creche + counts.financeiro;
  }

  private async get360QualityCounts(): Promise<Record<'albergue' | 'creche' | 'financeiro', number>> {
    const rows = await this.get360QualityBreakdown();

    return rows.reduce(
      (acc, row) => {
        acc[row.areaId] += row.value;
        return acc;
      },
      { albergue: 0, creche: 0, financeiro: 0 },
    );
  }

  private async get360QualityBreakdown(): Promise<Array<{
    areaId: 'albergue' | 'creche' | 'financeiro';
    area: string;
    category: string;
    label: string;
    value: number;
  }>> {
    const [
      albergueCadastros,
      albergueEstadias,
      crecheCadastros,
      crecheTurmas,
      financeiroProdutos,
      financeiroComandas,
    ] = await Promise.all([
      this.countSingle(`
        SELECT COUNT(DISTINCT p.id)::int AS total
        FROM pessoas p
        JOIN estadias e ON e.pessoa_id = p.id AND e.status = 'ativa'
        WHERE p.ativo = true
          AND (
            p.nis IS NULL OR btrim(p.nis) = ''
            OR p.data_nascimento IS NULL
            OR COALESCE(NULLIF(btrim(p.contato_emergencia), ''), NULLIF(btrim(p.telefone_emergencia), '')) IS NULL
            OR COALESCE(NULLIF(btrim(p.endereco), ''), NULLIF(btrim(p.cidade), '')) IS NULL
          )
      `),
      this.countSingle(`
        SELECT COUNT(*)::int AS total
        FROM estadias
        WHERE status = 'ativa' AND data_limite < CURRENT_DATE
      `),
      this.countSingle(`
        SELECT COUNT(*)::int AS total
        FROM creche_criancas c
        LEFT JOIN creche_responsaveis r ON r.crianca_id = c.id AND r.responsavel_principal = true
        WHERE c.status = 'ativa'
          AND (
            c.nis IS NULL OR btrim(c.nis) = ''
            OR c.data_nascimento IS NULL
            OR c.turma_id IS NULL
            OR r.id IS NULL
          )
      `),
      this.countSingle(`
        SELECT COUNT(*)::int AS total
        FROM creche_turmas
        WHERE ativa = true AND professora_responsavel_id IS NULL
      `),
      this.countSingle(`
        SELECT COUNT(*)::int AS total
        FROM comercio_produtos
        WHERE ativo = true
          AND (preco IS NULL OR preco <= 0 OR categoria IS NULL OR btrim(categoria) = '')
      `),
      this.countSingle(`
        WITH totais AS (
          SELECT c.id, c.created_at, COALESCE(SUM(i.total_item), 0) AS total
          FROM comercio_comandas c
          LEFT JOIN comercio_comanda_itens i ON i.comanda_id = c.id
          WHERE c.status IN ('aberta', 'aguardando_pagamento')
            AND c.created_at < NOW() - INTERVAL '1 day'
          GROUP BY c.id, c.created_at
          HAVING COALESCE(SUM(i.total_item), 0) > 0
        )
        SELECT COUNT(*)::int AS total FROM totais
      `),
    ]);

    return [
      {
        areaId: 'albergue',
        area: 'Albergue',
        category: 'Cadastro social',
        label: 'Albergue · Cadastro social',
        value: albergueCadastros,
      },
      {
        areaId: 'albergue',
        area: 'Albergue',
        category: 'Estadias vencidas',
        label: 'Albergue · Estadias vencidas',
        value: albergueEstadias,
      },
      {
        areaId: 'creche',
        area: 'E.E.I.',
        category: 'Cadastro infantil',
        label: 'E.E.I. · Cadastro infantil',
        value: crecheCadastros,
      },
      {
        areaId: 'creche',
        area: 'E.E.I.',
        category: 'Turmas',
        label: 'E.E.I. · Turmas',
        value: crecheTurmas,
      },
      {
        areaId: 'financeiro',
        area: 'Lojas',
        category: 'Produtos',
        label: 'Lojas · Produtos',
        value: financeiroProdutos,
      },
      {
        areaId: 'financeiro',
        area: 'Lojas',
        category: 'Comandas',
        label: 'Lojas · Comandas',
        value: financeiroComandas,
      },
    ];
  }

  private async countSingle(query: string, parameters: SqlParam[] = []): Promise<number> {
    try {
      const rows = await this.dataSource.query(query, parameters) as Array<Record<string, unknown>>;
      return Number(rows[0]?.total || 0);
    } catch {
      return 0;
    }
  }

  private map360Rows(rows: Array<Record<string, unknown>>): Relatorio360ChartRow[] {
    return rows.map((row) => ({
      key: typeof row.key === 'string'
        ? row.key
        : this.build360RowKey(row.label, row.area, row.category),
      label: String(row.label || 'Não informado'),
      value: Number(row.value || 0),
      area: typeof row.area === 'string' ? row.area : undefined,
      category: typeof row.category === 'string' ? row.category : undefined,
      detail: typeof row.detail === 'string' ? row.detail : undefined,
      source: typeof row.source === 'string'
        ? row.source
        : typeof row.area === 'string'
          ? row.area
          : undefined,
      confidence: this.resolve360Confidence(row.confidence, row.label, row.category),
    }));
  }

  private build360RowKey(...parts: unknown[]) {
    return parts
      .filter((part) => part !== undefined && part !== null && String(part).trim() !== '')
      .map((part) => String(part)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''))
      .filter(Boolean)
      .join(':') || 'nao-informado';
  }

  private resolve360Confidence(
    value: unknown,
    label: unknown,
    category: unknown,
  ): Relatorio360Confidence {
    if (value === 'completa' || value === 'parcial' || value === 'fraca') {
      return value;
    }

    const text = `${String(label || '')} ${String(category || '')}`.toLowerCase();
    if (text.includes('não informado') || text.includes('nao informado')) {
      return 'fraca';
    }

    return 'parcial';
  }

  private get360MetricSource(metric: Relatorio360Metric) {
    const sources: Record<Relatorio360MetricId, string> = {
      pessoas_atendidas: 'Albergue',
      acessos_albergue: 'Albergue',
      criancas_ativas_eei: 'E.E.I.',
      frequencia_eei: 'E.E.I.',
      vendas_realizadas: 'Lojas',
      pendencias_documentais: 'Qualidade de dados',
    };

    return sources[metric.id];
  }

  private get360DrilldownSummary(
    metric: Relatorio360Metric,
    dimension: Relatorio360Dimension,
    row: Relatorio360ChartRow,
    share: number,
  ) {
    if (dimension.id === 'raca_cor') {
      return `${row.label} representa ${share}% desta visão agregada de ${metric.label.toLowerCase()}. Use como leitura social, não como ranking individual.`;
    }

    if (dimension.id === 'periodo') {
      return `${row.label} concentra ${share}% do total exibido para ${metric.label.toLowerCase()} no período selecionado.`;
    }

    if (dimension.id === 'status_documental') {
      return `${row.label} mostra pendência operacional que pode fragilizar relatório, prestação de contas ou decisão institucional.`;
    }

    return `${row.label} representa ${share}% da visão atual de ${metric.label.toLowerCase()}.`;
  }

  private get360DrilldownAction(metric: Relatorio360MetricId) {
    const actions: Record<Relatorio360MetricId, string> = {
      pessoas_atendidas: 'Abrir relatório social do Albergue',
      acessos_albergue: 'Revisar fluxo de acolhimento',
      criancas_ativas_eei: 'Abrir relatório da E.E.I.',
      frequencia_eei: 'Conferir lançamentos de frequência',
      vendas_realizadas: 'Abrir relatório comercial',
      pendencias_documentais: 'Abrir qualidade de dados',
    };

    return actions[metric];
  }

  private get360DrilldownRows(
    metric: Relatorio360Metric,
    dimension: Relatorio360Dimension,
    selected: Relatorio360ChartRow,
    rows: Relatorio360ChartRow[],
    share: number,
  ): Relatorio360DrilldownRow[] {
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    const maxRow = rows.reduce<Relatorio360ChartRow | null>(
      (highest, row) => (!highest || row.value > highest.value ? row : highest),
      null,
    );

    return [
      {
        label: 'Ponto selecionado',
        value: selected.value,
        detail: selected.label,
        format: metric.format,
      },
      {
        label: 'Total da composição',
        value: total,
        detail: `${rows.length} linha(s) no recorte ${dimension.label.toLowerCase()}`,
        format: metric.format,
      },
      {
        label: 'Participação',
        value: share,
        detail: 'Percentual do ponto selecionado sobre a visão atual',
        format: 'percent',
      },
      {
        label: 'Maior ponto da visão',
        value: maxRow?.label || 'Sem dados',
        detail: maxRow ? `${maxRow.value} no maior ponto comparado` : undefined,
      },
    ];
  }

  private racaCorSql(field: string) {
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

  private get360DateBucket(period: PeriodoExecutivo) {
    if (period.escopo === 'ano') {
      return { unit: 'month', labelFormat: 'YYYY-MM' };
    }

    return { unit: 'day', labelFormat: 'DD/MM' };
  }

  async getRelatorioCustom(inicio?: string, fim?: string, campos: string[] = [], filtros: RelatorioFiltros = {}, lgpd: boolean = false) {
    // Validar campos permitidos para segurança
    const camposPermitidos = [
      'id',
      'nome',
      'nome_social',
      'cpf',
      'rg',
      'nis',
      'data_nascimento',
      'sexo',
      'genero',
      'cor',
      'raca',
      'sexualidade',
      'lgbt',
      'status_cadastro',
      'tipo_vaga',
      'created_at',
      'updated_at',
    ];
    const camposValidos = campos.filter(campo => camposPermitidos.includes(campo));

    if (camposValidos.length === 0) {
      throw new Error('Nenhum campo válido especificado');
    }

    const query = this.pessoaRepository.createQueryBuilder('pessoa')
      .select(camposValidos.map(campo => `pessoa.${campo}`))
      .where('pessoa.ativo = true');

    // LÓGICA MODIFICADA: Se houver filtro de datas, buscar por ESTADIA no período (relatório de acesso)
    // Se NÃO houver filtro de datas, buscar por CADASTRO (relatório geral)
    const temFiltroDatas = inicio && fim && inicio.trim() !== '' && fim.trim() !== '';

    if (temFiltroDatas) {
      // RELATÓRIO DE ACESSO: Pessoas que estiveram hospedadas no período
      query.innerJoin('pessoa.estadias', 'estadia')
           .andWhere(
             '(estadia.data_checkin <= :fim AND (estadia.data_checkout IS NULL OR estadia.data_checkout >= :inicio))',
             { inicio, fim }
           );

      // Se houver filtro de quarto, aplicar na estadia
      if (filtros.quarto && filtros.quarto !== 'Todos') {
        query.innerJoin('estadia.cama', 'cama')
             .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
      }

      // Adicionar DISTINCT para evitar duplicatas (pessoa pode ter múltiplas estadias)
      query.distinct(true);
    } else {
      // RELATÓRIO GERAL: Todos os cadastros (comportamento original)
      // Join with estadia and cama if quarto filter is provided
      if (filtros.quarto && filtros.quarto !== 'Todos') {
        query.innerJoin('pessoa.estadias', 'estadia', 'estadia.status = \'ativa\'')
             .innerJoin('estadia.cama', 'cama')
             .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
      }
    }

    // Adicione filtros dinâmicos com validação, excluding quarto
    Object.keys(filtros).forEach(key => {
      if (key !== 'quarto' && filtros[key] && camposPermitidos.includes(key)) {
        if (key === 'cor') {
          query.andWhere('LOWER(pessoa.cor) = LOWER(:cor)', { cor: filtros[key] });
          console.log('Aplicando filtro de cor em relatório custom:', filtros[key]);
        } else {
          query.andWhere(`pessoa.${key} = :${key}`, { [key]: filtros[key] });
        }
      }
    });

    const data = await query.getRawMany<RelatorioRow>();

    // Aplicar LGPD se necessário
    if (lgpd) {
      return data.map(item => {
        const masked = { ...item };
        if (typeof masked.nome === 'string') masked.nome = this.maskField(masked.nome);
        if (typeof masked.sobrenome === 'string') masked.sobrenome = this.maskField(masked.sobrenome);
        if (typeof masked.nome_social === 'string') masked.nome_social = this.maskField(masked.nome_social);
        if (typeof masked.cpf === 'string') masked.cpf = this.maskCPF(masked.cpf);
        return masked;
      });
    }

    return data;
  }

  private maskField(value: string): string {
    if (!value || value.length < 3) return '*'.repeat(value?.length || 1);
    return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1];
  }

  private maskCPF(cpf: string): string {
    if (!cpf || cpf.length !== 11) return cpf;
    return cpf.slice(0, 3).padEnd(11, '*');
  }

  async getRelatorioCustomExcel(inicio?: string, fim?: string, campos: string[] = [], filtros: RelatorioFiltros = {}, lgpd: boolean = false) {
    const data = await this.getRelatorioCustom(inicio, fim, campos, filtros, lgpd);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório');

    // Adicione cabeçalhos
    worksheet.columns = campos.map(campo => ({ header: campo, key: campo }));

    // Adicione dados
    worksheet.addRows(data);

    // Configure resposta para download
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async getRelatorioCustomPDF(inicio?: string, fim?: string, campos: string[] = [], filtros: RelatorioFiltros = {}, lgpd: boolean = false) {
    const data = await this.getRelatorioCustom(inicio, fim, campos, filtros, lgpd);

    const doc = new jsPDF();
    doc.text('Relatório Customizado', 20, 10);

    const tableData = data.map(row => campos.map(campo => String(row[campo] || '-')));

    (doc as unknown as PdfWithAutoTable).autoTable({
      head: [campos],
      body: tableData,
      startY: 20,
    });

    return doc.output('arraybuffer');
  }

  async getKPIs(inicio?: string, fim?: string, filtros: RelatorioFiltros = {}) {
    const query = this.pessoaRepository.createQueryBuilder('pessoa')
      .where('pessoa.ativo = true');

    // LÓGICA MODIFICADA: Se houver filtro de datas, buscar por ESTADIA no período (relatório de acesso)
    const temFiltroDatas = inicio && fim && inicio.trim() !== '' && fim.trim() !== '';

    if (temFiltroDatas) {
      // RELATÓRIO DE ACESSO: Pessoas que estiveram hospedadas no período
      query.innerJoin('pessoa.estadias', 'estadia')
           .andWhere(
             '(estadia.data_checkin <= :fim AND (estadia.data_checkout IS NULL OR estadia.data_checkout >= :inicio))',
             { inicio, fim }
           );

      // Se houver filtro de quarto, aplicar na estadia
      if (filtros.quarto && filtros.quarto !== 'Todos') {
        query.innerJoin('estadia.cama', 'cama')
             .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
      }

      // Adicionar DISTINCT
      query.distinct(true);
    } else {
      // RELATÓRIO GERAL: Todos os cadastros
      if (filtros.quarto && filtros.quarto !== 'Todos') {
        query.innerJoin('pessoa.estadias', 'estadia', 'estadia.status = \'ativa\'')
             .innerJoin('estadia.cama', 'cama')
             .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
      }
    }

    // Aplicar filtros dinâmicos, excluding quarto
    Object.keys(filtros).forEach(key => {
      if (key !== 'quarto' && filtros[key]) {
        if (key === 'cor') {
          query.andWhere('LOWER(pessoa.cor) = LOWER(:cor)', { cor: filtros[key] });
          console.log('Aplicando filtro de cor em KPIs:', filtros[key]);
        } else {
          query.andWhere(`pessoa.${key} = :${key}`, { [key]: filtros[key] });
        }
      }
    });

    const totalCadastros = await query.getCount();

    const mediaIdadeQuery = this.pessoaRepository.createQueryBuilder('pessoa')
      .select('AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, pessoa.data_nascimento)))', 'media')
      .where('pessoa.ativo = true')
      .andWhere('pessoa.data_nascimento IS NOT NULL');

    // Join with estadia and cama if quarto filter is provided
    if (filtros.quarto && filtros.quarto !== 'Todos') {
      mediaIdadeQuery.innerJoin('pessoa.estadias', 'estadia', 'estadia.status = \'ativa\'')
                     .innerJoin('estadia.cama', 'cama')
                     .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
    }

    if (inicio && fim && inicio.trim() !== '' && fim.trim() !== '') {
      mediaIdadeQuery.andWhere('pessoa.created_at BETWEEN :inicio AND :fim', { inicio, fim });
    }

    // Aplicar filtros dinâmicos, excluding quarto
    Object.keys(filtros).forEach(key => {
      if (key !== 'quarto' && filtros[key]) {
        if (key === 'cor') {
          mediaIdadeQuery.andWhere('LOWER(pessoa.cor) = LOWER(:cor)', { cor: filtros[key] });
        } else {
          mediaIdadeQuery.andWhere(`pessoa.${key} = :${key}`, { [key]: filtros[key] });
        }
      }
    });

    const mediaIdade = await mediaIdadeQuery.getRawOne();

    const distribuicaoCorQuery = this.pessoaRepository.createQueryBuilder('pessoa')
      .select('pessoa.cor', 'cor')
      .addSelect('COUNT(*)', 'count')
      .where('pessoa.ativo = true')
      .andWhere('pessoa.cor IS NOT NULL');

    // Join with estadia and cama if quarto filter is provided
    if (filtros.quarto && filtros.quarto !== 'Todos') {
      distribuicaoCorQuery.innerJoin('pessoa.estadias', 'estadia', 'estadia.status = \'ativa\'')
                          .innerJoin('estadia.cama', 'cama')
                          .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
    }

    if (inicio && fim && inicio.trim() !== '' && fim.trim() !== '') {
      distribuicaoCorQuery.andWhere('pessoa.created_at BETWEEN :inicio AND :fim', { inicio, fim });
    }

    // Aplicar filtros dinâmicos, excluding quarto
    Object.keys(filtros).forEach(key => {
      if (key !== 'quarto' && filtros[key]) {
        if (key === 'cor') {
          distribuicaoCorQuery.andWhere('LOWER(pessoa.cor) = LOWER(:cor)', { cor: filtros[key] });
        } else {
          distribuicaoCorQuery.andWhere(`pessoa.${key} = :${key}`, { [key]: filtros[key] });
        }
      }
    });

    distribuicaoCorQuery.groupBy('pessoa.cor');
    const distribuicaoCor = await distribuicaoCorQuery.getRawMany();

    const distribuicaoGeneroQuery = this.pessoaRepository.createQueryBuilder('pessoa')
      .select('pessoa.genero', 'genero')
      .addSelect('COUNT(*)', 'count')
      .where('pessoa.ativo = true')
      .andWhere('pessoa.genero IS NOT NULL');

    // Join with estadia and cama if quarto filter is provided
    if (filtros.quarto && filtros.quarto !== 'Todos') {
      distribuicaoGeneroQuery.innerJoin('pessoa.estadias', 'estadia', 'estadia.status = \'ativa\'')
                             .innerJoin('estadia.cama', 'cama')
                             .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
    }

    if (inicio && fim && inicio.trim() !== '' && fim.trim() !== '') {
      distribuicaoGeneroQuery.andWhere('pessoa.created_at BETWEEN :inicio AND :fim', { inicio, fim });
    }

    // Aplicar filtros dinâmicos, excluding quarto
    Object.keys(filtros).forEach(key => {
      if (key !== 'quarto' && filtros[key]) {
        if (key === 'cor') {
          distribuicaoGeneroQuery.andWhere('LOWER(pessoa.cor) = LOWER(:cor)', { cor: filtros[key] });
        } else {
          distribuicaoGeneroQuery.andWhere(`pessoa.${key} = :${key}`, { [key]: filtros[key] });
        }
      }
    });

    distribuicaoGeneroQuery.groupBy('pessoa.genero');
    const distribuicaoGenero = await distribuicaoGeneroQuery.getRawMany();

    return {
      total: totalCadastros,
      mediaIdade: Math.round(parseFloat(mediaIdade?.media || '0')),
      distribuicaoCor: distribuicaoCor.reduce((acc, row) => { acc[row.cor] = parseInt(row.count); return acc; }, {}),
      distribuicaoGenero: distribuicaoGenero.reduce((acc, row) => { acc[row.genero] = parseInt(row.count); return acc; }, {}),
    };
  }

  async getRelatorioEstadias(inicio?: string, fim?: string) {
    const query = this.estadiaRepository.createQueryBuilder('estadia')
      .leftJoinAndSelect('estadia.pessoa', 'pessoa')
      .select([
        'pessoa.nome',
        'estadia.data_checkin',
        'estadia.data_checkout',
        'estadia.dias_permanencia',
      ]);

    if (inicio && fim) {
      query.andWhere('estadia.data_checkin BETWEEN :inicio AND :fim', { inicio, fim });
    }

    return query.getRawMany();
  }

  async getResumoOperacional(inicio?: string, fim?: string, filtros: RelatorioFiltros = {}) {
    const hoje = new Date();
    const periodoInicio = inicio || new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
    const periodoFim = fim || new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
    const params: SqlParam[] = [periodoInicio, periodoFim];
    let filtroQuarto = '';

    if (filtros.quarto && filtros.quarto !== 'Todos') {
      params.push(filtros.quarto);
      filtroQuarto = 'AND c.casa = $3';
    }

    const [resumo] = await this.estadiaRepository.query(
      `
        WITH estadias_periodo AS (
          SELECT
            e.id,
            e.pessoa_id,
            e.data_checkin::date AS data_checkin,
            e.data_checkout::date AS data_checkout
          FROM estadias e
          LEFT JOIN camas c ON c.id = e.cama_id
          WHERE e.data_checkin::date <= $2::date
            AND COALESCE(e.data_checkout::date, $2::date) >= $1::date
            ${filtroQuarto}
        ),
        primeira_estadia AS (
          SELECT pessoa_id, MIN(data_checkin::date) AS primeira_data
          FROM estadias
          GROUP BY pessoa_id
        )
        SELECT
          COUNT(ep.id)::int AS acessos_periodo,
          COUNT(DISTINCT ep.pessoa_id)::int AS pessoas_unicas,
          COUNT(DISTINCT ep.pessoa_id) FILTER (
            WHERE pe.primeira_data BETWEEN $1::date AND $2::date
          )::int AS novos_acessos,
          COUNT(DISTINCT ep.pessoa_id) FILTER (
            WHERE pe.primeira_data < $1::date
          )::int AS retornos,
          COALESCE(SUM(
            GREATEST(
              1,
              (
                LEAST(COALESCE(ep.data_checkout, $2::date), $2::date)
                - GREATEST(ep.data_checkin, $1::date)
              )::int + 1
            )
          ), 0)::int AS pernoites_estimados
        FROM estadias_periodo ep
        JOIN primeira_estadia pe ON pe.pessoa_id = ep.pessoa_id
      `,
      params,
    );

    const faixaEtaria = await this.estadiaRepository.query<FaixaEtariaRow[]>(
      `
        WITH pessoas_periodo AS (
          SELECT DISTINCT e.pessoa_id
          FROM estadias e
          LEFT JOIN camas c ON c.id = e.cama_id
          WHERE e.data_checkin::date <= $2::date
            AND COALESCE(e.data_checkout::date, $2::date) >= $1::date
            ${filtroQuarto}
        )
        SELECT faixa, COUNT(*)::int AS total
        FROM (
          SELECT
            CASE
              WHEN p.data_nascimento IS NULL THEN 'Não informado'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) BETWEEN 18 AND 24 THEN '18 a 24'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) BETWEEN 25 AND 29 THEN '25 a 29'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) BETWEEN 30 AND 39 THEN '30 a 39'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) BETWEEN 40 AND 49 THEN '40 a 49'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) BETWEEN 50 AND 59 THEN '50 a 59'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) >= 60 THEN '60+'
              ELSE 'Não informado'
            END AS faixa
          FROM pessoas_periodo pp
          JOIN pessoas p ON p.id = pp.pessoa_id
        ) faixas
        GROUP BY faixa
        ORDER BY
          CASE faixa
            WHEN '18 a 24' THEN 1
            WHEN '25 a 29' THEN 2
            WHEN '30 a 39' THEN 3
            WHEN '40 a 49' THEN 4
            WHEN '50 a 59' THEN 5
            WHEN '60+' THEN 6
            ELSE 7
          END
      `,
      params,
    );

    return {
      periodo: {
        inicio: periodoInicio,
        fim: periodoFim,
      },
      acessosPeriodo: Number(resumo?.acessos_periodo || 0),
      pessoasUnicas: Number(resumo?.pessoas_unicas || 0),
      novosAcessos: Number(resumo?.novos_acessos || 0),
      retornos: Number(resumo?.retornos || 0),
      pernoitesEstimados: Number(resumo?.pernoites_estimados || 0),
      faixaEtaria: faixaEtaria.map((row) => ({
        faixa: row.faixa,
        total: Number(row.total || 0),
      })),
    };
  }

  async salvarDashboardPersonalizado(_userId: string, _nome: string, _config: unknown) {
    throw new NotImplementedException('Dashboards personalizados ainda não foram oficializados.');
  }

  async getDashboardsPersonalizados(_userId: string) {
    return [];
  }

  async getDadosGraficos(periodo: 'mes' | 'ano', tipo: 'barra' | 'linha' | 'pizza', filtros: RelatorioFiltros = {}, quarto?: string, _recortes: string[] = [], dataInicio?: string, dataFim?: string) {
    const inicio = dataInicio ? new Date(dataInicio) : new Date();
    const fim = dataFim ? new Date(dataFim) : new Date();
    const diffDias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const isDiario = diffDias <= 30;

    const labels: string[] = [];
    const values: number[] = [];

    if (isDiario) {
      // Ocupação diária para o período selecionado
      for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        const dataDia = new Date(d);
        const ocupacaoDia = await this.calcularOcupacaoDia(dataDia, filtros, quarto);
        labels.push(dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
        values.push(ocupacaoDia);
      }
    } else {
      // Média mensal para o período
      const meses = [];
      const current = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
      while (current <= fim) {
        meses.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
      for (const mes of meses) {
        const mediaMes = await this.calcularMediaOcupacaoMes(mes, filtros, quarto);
        labels.push(mes.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }));
        values.push(mediaMes);
      }
    }

    return {
      labels,
      datasets: [{
        label: isDiario ? 'Ocupação Diária' : 'Média Mensal de Ocupação',
        data: values,
        backgroundColor: tipo === 'pizza' ? ['#FF6384', '#36A2EB', '#FFCE56'] : '#36A2EB',
        borderColor: tipo === 'linha' ? '#36A2EB' : undefined,
        fill: tipo === 'linha' ? false : undefined,
      }],
    };
  }

  async calcularOcupacaoDia(data: Date, filtros: RelatorioFiltros = {}, quarto?: string): Promise<number> {
    const query = this.pessoaRepository.createQueryBuilder('pessoa')
      .leftJoin('pessoa.estadias', 'estadia')
      .leftJoin('estadia.cama', 'cama')
      .where('estadia.status = :status', { status: 'ativa' })
      .andWhere('estadia.data_checkin <= :data', { data })
      .andWhere('(estadia.data_checkout IS NULL OR estadia.data_checkout >= :data)', { data });

    if (quarto) {
      query.andWhere('cama.casa = :quarto', { quarto });
    }
    if (filtros.genero) {
      query.andWhere('pessoa.genero = :genero', { genero: filtros.genero });
    }
    if (filtros.lgbt !== undefined) {
      query.andWhere('pessoa.lgbt = :lgbt', { lgbt: filtros.lgbt });
    }
    if (filtros.cor) {
      query.andWhere('LOWER(pessoa.cor) = LOWER(:cor)', { cor: filtros.cor });
      console.log('Aplicando filtro de cor em gráfico:', filtros.cor);
    }

    return await query.getCount();
  }

  async calcularMediaOcupacaoMes(mes: Date, filtros: RelatorioFiltros = {}, quarto?: string): Promise<number> {
    const ano = mes.getFullYear();
    const mesNum = mes.getMonth();
    const diasNoMes = new Date(ano, mesNum + 1, 0).getDate();
    let totalOcupacao = 0;

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const data = new Date(ano, mesNum, dia);
      totalOcupacao += await this.calcularOcupacaoDia(data, filtros, quarto);
    }

    return Math.round(totalOcupacao / diasNoMes);
  }
}
