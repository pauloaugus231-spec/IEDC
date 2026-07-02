import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { ESCOLA_DATABASE_CONNECTION, MASTER_DATABASE_CONNECTION } from '../../config/database.config';
import { AuthUser } from '../../auth/auth.types';
import { UsuarioRole } from '../../entities/usuario.entity';
import { type PeriodoExecutivo, type RelatorioExecutivoKpi, type SqlParam, getExecutivePeriod } from './relatorios-core-types';
import {
  type Relatorio360ChartRow,
  type Relatorio360ChartType,
  type Relatorio360Compatibility,
  type Relatorio360Confidence,
  type Relatorio360Dimension,
  type Relatorio360DimensionId,
  type Relatorio360DrilldownRow,
  type Relatorio360Metric,
  type Relatorio360MetricId,
  type RelatorioGestao360DrilldownResponse,
  type RelatorioGestao360Response,
  RELATORIO_360_COMPATIBILITY,
  RELATORIO_360_DIMENSIONS,
  RELATORIO_360_METRICS,
  countSingle,
  racaCorSql,
} from './relatorios-360-types';

@Injectable()
export class RelatoriosGestao360Service {
  constructor(
    @InjectDataSource() private readonly albergueDataSource: DataSource,
    @InjectDataSource(ESCOLA_DATABASE_CONNECTION) private readonly escolaDataSource: DataSource,
    @InjectDataSource(MASTER_DATABASE_CONNECTION) private readonly masterDataSource: DataSource,
  ) {}

  async getRelatorioGestao360(
    actor: AuthUser | undefined,
    periodo?: string,
    metricId?: string,
    dimensionId?: string,
    chartType?: string,
  ): Promise<RelatorioGestao360Response> {
    this.ensureGestao360Access(actor);

    const period = getExecutivePeriod(periodo);
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

    const period = getExecutivePeriod(periodo);
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

  private ensureGestao360Access(actor: AuthUser | undefined) {
    if (!actor || actor.role !== UsuarioRole.GESTORA) {
      throw new ForbiddenException('Este perfil não acessa o Explorador Institucional 360.');
    }
  }

  private resolve360Metric(value?: string): Relatorio360Metric {
    const found = RELATORIO_360_METRICS.find((metric) => metric.id === value);
    return found || RELATORIO_360_METRICS[0];
  }

  private get360Compatibility(metric: Relatorio360MetricId): Relatorio360Compatibility {
    const found = RELATORIO_360_COMPATIBILITY.find((item) => item.metric === metric);
    return found || RELATORIO_360_COMPATIBILITY[0];
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
      countSingle(this.albergueDataSource, `
        SELECT COUNT(DISTINCT e.pessoa_id)::int AS total
        FROM estadias e
        WHERE e.data_checkin::date < $2::date
          AND COALESCE(e.data_checkout::date, $2::date) >= $1::date
      `, [period.inicio, period.fim]),
      countSingle(this.albergueDataSource, `
        SELECT COUNT(*)::int AS total
        FROM estadias
        WHERE data_checkin >= $1::date AND data_checkin < $2::date
      `, [period.inicio, period.fim]),
      countSingle(this.escolaDataSource, `
        SELECT COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE presente) / NULLIF(COUNT(*), 0)), 0)::int AS total
        FROM creche_frequencias
        WHERE data >= $1::date AND data < $2::date
      `, [period.inicio, period.fim]),
      countSingle(this.masterDataSource, `
        SELECT COALESCE(SUM(valor), 0)::float AS total
        FROM comercial.pagamentos
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
    return this.map360Rows(await this.albergueDataSource.query(
      `
        SELECT
          ${racaCorSql('p.cor')} AS label,
          COUNT(DISTINCT p.id)::int AS value,
          'Albergue' AS area,
          ${racaCorSql('p.cor')} AS category
        FROM pessoas p
        JOIN estadias e ON e.pessoa_id = p.id
        WHERE e.data_checkin::date < $2::date
          AND COALESCE(e.data_checkout::date, $2::date) >= $1::date
        GROUP BY ${racaCorSql('p.cor')}
        ORDER BY value DESC, label
      `,
      [period.inicio, period.fim],
    ));
  }

  private async get360CadastrosAlberguePorPeriodo(period: PeriodoExecutivo): Promise<Relatorio360ChartRow[]> {
    const bucket = this.get360DateBucket(period);

    return this.map360Rows(await this.albergueDataSource.query(
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

    return this.map360Rows(await this.albergueDataSource.query(
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
    return this.map360Rows(await this.albergueDataSource.query(
      `
        SELECT
          ${racaCorSql('p.cor')} AS label,
          COUNT(*)::int AS value,
          'Albergue' AS area,
          ${racaCorSql('p.cor')} AS category
        FROM estadias e
        JOIN pessoas p ON p.id = e.pessoa_id
        WHERE e.data_checkin >= $1::date AND e.data_checkin < $2::date
        GROUP BY ${racaCorSql('p.cor')}
        ORDER BY value DESC, label
      `,
      [period.inicio, period.fim],
    ));
  }

  private async get360CriancasPorRacaCor(): Promise<Relatorio360ChartRow[]> {
    return this.map360Rows(await this.escolaDataSource.query(
      `
        SELECT
          ${racaCorSql('raca_cor')} AS label,
          COUNT(*)::int AS value,
          'E.E.I.' AS area,
          ${racaCorSql('raca_cor')} AS category
        FROM creche_criancas
        WHERE status = 'ativa'
        GROUP BY ${racaCorSql('raca_cor')}
        ORDER BY value DESC, label
      `,
    ));
  }

  private async get360FrequenciaPorPeriodo(period: PeriodoExecutivo): Promise<Relatorio360ChartRow[]> {
    const bucket = this.get360DateBucket(period);

    return this.map360Rows(await this.escolaDataSource.query(
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

    return this.map360Rows(await this.masterDataSource.query(
      `
        SELECT
          to_char(date_trunc('${bucket.unit}', created_at)::date, '${bucket.labelFormat}') AS label,
          COALESCE(SUM(valor), 0)::float AS value,
          'Lojas' AS area,
          COUNT(*)::int || ' pagamento(s)' AS detail
        FROM comercial.pagamentos
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
      { key: 'albergue', label: 'Albergue', value: counts.albergue, area: 'Albergue', source: 'Qualidade de dados', confidence: 'parcial', tone: counts.albergue ? 'warning' : 'success' },
      { key: 'eei', label: 'E.E.I.', value: counts.creche, area: 'E.E.I.', source: 'Qualidade de dados', confidence: 'parcial', tone: counts.creche ? 'warning' : 'success' },
      { key: 'lojas', label: 'Lojas', value: counts.comercial, area: 'Lojas', source: 'Qualidade de dados', confidence: 'parcial', tone: counts.comercial ? 'warning' : 'success' },
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
    return counts.albergue + counts.creche + counts.comercial;
  }

  private async get360QualityCounts(): Promise<Record<'albergue' | 'creche' | 'comercial', number>> {
    const rows = await this.get360QualityBreakdown();

    return rows.reduce(
      (acc, row) => {
        acc[row.areaId] += row.value;
        return acc;
      },
      { albergue: 0, creche: 0, comercial: 0 },
    );
  }

  private async get360QualityBreakdown(): Promise<Array<{
    areaId: 'albergue' | 'creche' | 'comercial';
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
      countSingle(this.albergueDataSource, `
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
      countSingle(this.albergueDataSource, `
        SELECT COUNT(*)::int AS total
        FROM estadias
        WHERE status = 'ativa' AND data_limite < CURRENT_DATE
      `),
      countSingle(this.escolaDataSource, `
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
      countSingle(this.escolaDataSource, `
        SELECT COUNT(*)::int AS total
        FROM creche_turmas
        WHERE ativa = true AND professora_responsavel_id IS NULL
      `),
      countSingle(this.masterDataSource, `
        SELECT COUNT(*)::int AS total
        FROM comercial.produtos
        WHERE ativo = true
          AND (preco IS NULL OR preco <= 0 OR categoria IS NULL OR btrim(categoria) = '')
      `),
      countSingle(this.masterDataSource, `
        WITH totais AS (
          SELECT c.id, c.created_at, COALESCE(SUM(i.total_item), 0) AS total
          FROM comercial.comandas c
          LEFT JOIN comercial.comanda_itens i ON i.comanda_id = c.id
          WHERE c.status IN ('aberta', 'aguardando_pagamento')
            AND c.created_at < NOW() - INTERVAL '1 day'
          GROUP BY c.id, c.created_at
          HAVING COALESCE(SUM(i.total_item), 0) > 0
        )
        SELECT COUNT(*)::int AS total FROM totais
      `),
    ]);

    return [
      { areaId: 'albergue', area: 'Albergue', category: 'Cadastro social', label: 'Albergue · Cadastro social', value: albergueCadastros },
      { areaId: 'albergue', area: 'Albergue', category: 'Estadias vencidas', label: 'Albergue · Estadias vencidas', value: albergueEstadias },
      { areaId: 'creche', area: 'E.E.I.', category: 'Cadastro infantil', label: 'E.E.I. · Cadastro infantil', value: crecheCadastros },
      { areaId: 'creche', area: 'E.E.I.', category: 'Turmas', label: 'E.E.I. · Turmas', value: crecheTurmas },
      { areaId: 'comercial', area: 'Lojas', category: 'Produtos', label: 'Lojas · Produtos', value: financeiroProdutos },
      { areaId: 'comercial', area: 'Lojas', category: 'Comandas', label: 'Lojas · Comandas', value: financeiroComandas },
    ];
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
        .replace(/[̀-ͯ]/g, '')
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
      { label: 'Ponto selecionado', value: selected.value, detail: selected.label, format: metric.format },
      { label: 'Total da composição', value: total, detail: `${rows.length} linha(s) no recorte ${dimension.label.toLowerCase()}`, format: metric.format },
      { label: 'Participação', value: share, detail: 'Percentual do ponto selecionado sobre a visão atual', format: 'percent' },
      { label: 'Maior ponto da visão', value: maxRow?.label || 'Sem dados', detail: maxRow ? `${maxRow.value} no maior ponto comparado` : undefined },
    ];
  }

  private get360DateBucket(period: PeriodoExecutivo) {
    if (period.escopo === 'ano') {
      return { unit: 'month', labelFormat: 'YYYY-MM' };
    }
    return { unit: 'day', labelFormat: 'DD/MM' };
  }
}
