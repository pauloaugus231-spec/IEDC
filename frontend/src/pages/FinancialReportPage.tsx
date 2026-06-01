import { BarChart, LineChart, type BarSeriesOption, type LineSeriesOption } from 'echarts/charts';
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  type AriaComponentOption,
  type GridComponentOption,
  type LegendComponentOption,
  type TooltipComponentOption,
} from 'echarts/components';
import { graphic, type ComposeOption } from 'echarts/core';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getRelatorioFinanceiroDrilldown,
  useRelatorioFinanceiro,
  type LojasPeriodo,
  type RelatorioFinanceiroDimension,
  type RelatorioFinanceiroDrilldown,
  type RelatorioFinanceiroValor,
} from '../api';
import { BarChart2, Download, RefreshCw, X } from '../components/Icons';
import { useLojasRealtime } from '../hooks/useLojasRealtime';
import '../styles/financial-report.css';

echarts.use([AriaComponent, BarChart, CanvasRenderer, GridComponent, LegendComponent, LineChart, TooltipComponent]);

const periodOptions: { label: string; value: LojasPeriodo }[] = [
  { label: 'Dia', value: 'dia' },
  { label: 'Semana', value: 'semana' },
  { label: 'Mês', value: 'mes' },
  { label: 'Ano', value: 'ano' },
];

const chartModes = [
  { label: 'Fluxo', value: 'fluxo' },
  { label: 'Lojas', value: 'lojas' },
  { label: 'Pagamentos', value: 'pagamentos' },
] as const;

type ChartMode = (typeof chartModes)[number]['value'];
type EChartsInstance = ReturnType<typeof echarts.init>;
type FinancialChartOption = ComposeOption<
  AriaComponentOption | BarSeriesOption | GridComponentOption | LegendComponentOption | LineSeriesOption | TooltipComponentOption
>;

type EChartCanvasProps = {
  ariaLabel: string;
  className?: string;
  onDataClick?: (dataIndex: number) => void;
  onReady?: (chart: EChartsInstance | null) => void;
  option: FinancialChartOption;
};

const currency = new Intl.NumberFormat('pt-BR', {
  currency: 'BRL',
  style: 'currency',
});

const numberFormatter = new Intl.NumberFormat('pt-BR');
const chartColors = {
  previsto: '#f0b24f',
  realizado: '#0041aa',
  desistencias: '#b42318',
};

function EChartCanvas({ ariaLabel, className, onDataClick, onReady, option }: EChartCanvasProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsInstance | null>(null);

  useEffect(() => {
    if (!elementRef.current) return undefined;

    const chart = echarts.init(elementRef.current, undefined, { renderer: 'canvas' });
    chartRef.current = chart;
    onReady?.(chart);

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
      onReady?.(null);
      chart.dispose();
      chartRef.current = null;
    };
  }, [onReady]);

  useEffect(() => {
    chartRef.current?.setOption(option, { lazyUpdate: true, notMerge: false });
  }, [option]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !onDataClick) return undefined;

    const handler = (params: unknown) => {
      if (typeof params === 'object' && params && 'dataIndex' in params) {
        const dataIndex = Number((params as { dataIndex?: number }).dataIndex);
        if (Number.isFinite(dataIndex)) onDataClick(dataIndex);
      }
    };

    chart.on('click', handler);
    return () => {
      chart.off('click', handler);
    };
  }, [onDataClick]);

  return <div aria-label={ariaLabel} className={className} ref={elementRef} role="img" />;
}

function formatValue(value: number, format: RelatorioFinanceiroValor['format']) {
  if (format === 'currency') return currency.format(value);
  if (format === 'percent') return `${numberFormatter.format(value)}%`;
  return numberFormatter.format(value);
}

function formatDate(value: string, period: LojasPeriodo) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('pt-BR', {
    day: period === 'ano' ? undefined : '2-digit',
    month: 'short',
  });
}

function formatDateTime(value?: string) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return 'Agora';

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  });
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    aberta: 'Aberta',
    aguardando_pagamento: 'Aguardando pagamento',
    cancelada: 'Cancelada',
    desistencia: 'Desistência',
    expirada: 'Expirada',
    paga: 'Paga',
  };

  return labels[status] || status;
}

function buildChartOption(data: ReturnType<typeof useRelatorioFinanceiro>['data'], mode: ChartMode, periodo: LojasPeriodo): FinancialChartOption {
  const tooltipBase = {
    backgroundColor: '#ffffff',
    borderColor: '#d8e4f2',
    borderWidth: 1,
    confine: true,
    extraCssText: 'box-shadow:0 8px 14px rgba(10,35,80,.12);border-radius:12px;padding:10px 12px;',
    textStyle: {
      color: '#172033',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 13,
      fontWeight: 700,
    },
  };

  const common = {
    animationDuration: 820,
    animationDurationUpdate: 680,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'cubicOut',
    aria: {
      enabled: true,
    },
    grid: {
      bottom: 38,
      containLabel: true,
      left: 18,
      right: 18,
      top: 36,
    },
    tooltip: tooltipBase,
  } satisfies FinancialChartOption;

  if (!data) {
    return {
      ...common,
      xAxis: { data: [], type: 'category' },
      yAxis: { type: 'value' },
      series: [],
    };
  }

  if (mode === 'lojas') {
    const rows = [...data.porLoja].sort((a, b) => b.realizado - a.realizado);

    return {
      ...common,
      grid: { ...common.grid, left: 86, top: 26 },
      tooltip: {
        ...tooltipBase,
        formatter: (params: unknown) => {
          const point = Array.isArray(params) ? params[0] : params;
          const index = typeof point === 'object' && point && 'dataIndex' in point
            ? Number((point as { dataIndex?: number }).dataIndex)
            : 0;
          const row = rows[index];
          if (!row) return 'Loja';
          return [
            `<strong>${row.nome}</strong>`,
            `Realizado: ${currency.format(row.realizado)}`,
            `A receber: ${currency.format(row.previsto)}`,
            `Comandas: ${row.comandas}`,
          ].join('<br/>');
        },
        trigger: 'axis',
      },
      xAxis: {
        axisLabel: {
          color: '#617089',
          formatter: (value: number) => currency.format(Number(value)),
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#edf3f8' } },
        type: 'value',
      },
      yAxis: {
        axisLabel: { color: '#26334a', fontWeight: 800 },
        axisLine: { show: false },
        axisTick: { show: false },
        data: rows.map((row) => row.nome),
        type: 'category',
      },
      series: [
        {
          barMaxWidth: 22,
          data: rows.map((row) => row.realizado),
          itemStyle: {
            borderRadius: [0, 10, 10, 0],
            color: '#0041aa',
          },
          name: 'Realizado',
          type: 'bar',
        },
        {
          barMaxWidth: 22,
          data: rows.map((row) => row.previsto),
          itemStyle: {
            borderRadius: [0, 10, 10, 0],
            color: '#f0b24f',
          },
          name: 'A receber',
          type: 'bar',
        },
      ],
    };
  }

  if (mode === 'pagamentos') {
    const rows = [...data.porPagamento].sort((a, b) => b.total - a.total);

    return {
      ...common,
      grid: { ...common.grid, left: 54, top: 26 },
      tooltip: {
        ...tooltipBase,
        formatter: (params: unknown) => {
          const point = Array.isArray(params) ? params[0] : params;
          const index = typeof point === 'object' && point && 'dataIndex' in point
            ? Number((point as { dataIndex?: number }).dataIndex)
            : 0;
          const row = rows[index];
          if (!row) return 'Pagamento';
          return [
            `<strong>${row.metodo}</strong>`,
            `Total: ${currency.format(row.total)}`,
            `Registros: ${row.quantidade}`,
          ].join('<br/>');
        },
        trigger: 'axis',
      },
      xAxis: {
        axisLabel: { color: '#26334a', fontWeight: 800 },
        axisLine: { lineStyle: { color: '#d8e4f2' } },
        axisTick: { show: false },
        data: rows.map((row) => row.metodo),
        type: 'category',
      },
      yAxis: {
        axisLabel: {
          color: '#617089',
          formatter: (value: number) => currency.format(Number(value)),
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#edf3f8' } },
        type: 'value',
      },
      series: [
        {
          barMaxWidth: 34,
          data: rows.map((row) => row.total),
          itemStyle: {
            borderRadius: [10, 10, 0, 0],
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              { color: '#0f7a45', offset: 0 },
              { color: '#52b982', offset: 1 },
            ]),
          },
          name: 'Recebido',
          type: 'bar',
        },
      ],
    };
  }

  const rows = data.serie;

    return {
      ...common,
      color: [chartColors.realizado, chartColors.previsto, chartColors.desistencias],
      legend: {
        bottom: 0,
        icon: 'roundRect',
      itemHeight: 8,
      itemWidth: 18,
      textStyle: { color: '#617089', fontWeight: 700 },
    },
    tooltip: {
      ...tooltipBase,
      formatter: (params: unknown) => {
        const points = Array.isArray(params) ? params : [params];
        const first = points[0];
        const index = typeof first === 'object' && first && 'dataIndex' in first
          ? Number((first as { dataIndex?: number }).dataIndex)
          : 0;
        const row = rows[index];
        if (!row) return 'Fluxo financeiro';
        return [
          `<strong>${formatDate(row.data, periodo)}</strong>`,
          `Realizado: ${currency.format(row.realizado)}`,
          `Previsto: ${currency.format(row.previsto)}`,
          `Desistências: ${currency.format(row.desistencias ?? 0)}`,
        ].join('<br/>');
      },
      trigger: 'axis',
    },
    xAxis: {
      axisLabel: { color: '#617089', fontWeight: 700 },
      axisLine: { lineStyle: { color: '#d8e4f2' } },
      axisTick: { show: false },
      boundaryGap: false,
      data: rows.map((row) => formatDate(row.data, periodo)),
      type: 'category',
    },
    yAxis: {
      axisLabel: {
        color: '#617089',
        formatter: (value: number) => currency.format(Number(value)),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#edf3f8' } },
      type: 'value',
    },
    series: [
      {
        areaStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { color: 'rgba(0,65,170,.24)', offset: 0 },
            { color: 'rgba(0,65,170,.02)', offset: 1 },
          ]),
        },
        data: rows.map((row) => row.realizado),
        itemStyle: { color: chartColors.realizado },
        lineStyle: { color: chartColors.realizado, width: 4 },
        name: 'Realizado',
        showSymbol: false,
        smooth: true,
        type: 'line',
      },
      {
        data: rows.map((row) => row.previsto),
        itemStyle: { color: chartColors.previsto },
        lineStyle: { color: chartColors.previsto, type: 'dashed', width: 3 },
        name: 'Previsto',
        showSymbol: false,
        smooth: true,
        type: 'line',
      },
      {
        data: rows.map((row) => row.desistencias ?? 0),
        itemStyle: { color: chartColors.desistencias },
        lineStyle: { color: chartColors.desistencias, type: 'dotted', width: 3 },
        name: 'Desistências',
        showSymbol: false,
        smooth: true,
        type: 'line',
      },
    ],
  };
}

const FinancialReportPage = () => {
  const prefersReducedMotion = useReducedMotion();
  const [periodo, setPeriodo] = useState<LojasPeriodo>('mes');
  const [reload, setReload] = useState(0);
  const [chartMode, setChartMode] = useState<ChartMode>('fluxo');
  const [chartApi, setChartApi] = useState<EChartsInstance | null>(null);
  const [drilldown, setDrilldown] = useState<RelatorioFinanceiroDrilldown | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState<string | null>(null);
  const { data, error, loading } = useRelatorioFinanceiro(periodo, reload);

  useLojasRealtime(() => setReload((value) => value + 1));

  const chartOption = useMemo(() => buildChartOption(data, chartMode, periodo), [chartMode, data, periodo]);

  const openDrilldown = useCallback(async (dimension: RelatorioFinanceiroDimension, key: string) => {
    setDrilldownLoading(true);
    setDrilldownError(null);

    try {
      const response = await getRelatorioFinanceiroDrilldown(periodo, dimension, key);
      setDrilldown(response);
    } catch (err: unknown) {
      setDrilldownError(err instanceof Error ? err.message : 'Não foi possível carregar o recorte.');
    } finally {
      setDrilldownLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    if (!data || drilldown) return;
    void openDrilldown('status', 'realizado');
  }, [data, drilldown, openDrilldown]);

  const handleChartClick = useCallback((dataIndex: number) => {
    if (!data) return;

    if (chartMode === 'lojas') {
      const rows = [...data.porLoja].sort((a, b) => b.realizado - a.realizado);
      const row = rows[dataIndex];
      if (row) void openDrilldown('loja', row.slug);
      return;
    }

    if (chartMode === 'pagamentos') {
      const rows = [...data.porPagamento].sort((a, b) => b.total - a.total);
      const row = rows[dataIndex];
      if (row) void openDrilldown('metodo', row.metodo);
      return;
    }

    const row = data.serie[dataIndex];
    if (row) void openDrilldown('periodo', row.data);
  }, [chartMode, data, openDrilldown]);

  const exportChartPng = () => {
    if (!chartApi) return;
    const url = chartApi.getDataURL({
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      type: 'png',
    });
    const link = document.createElement('a');
    link.download = `mesa-financeira-${periodo}.png`;
    link.href = url;
    link.click();
  };

  const downloadFechamento = (format: 'pdf' | 'excel') => {
    window.location.href = `/api/lojas/fechamento/${format}?periodo=${periodo}`;
  };

  const statusFechamento = data?.statusFechamento === 'com_pendencias' ? 'Com pendências' : 'Em dia';
  const statusTone = data?.statusFechamento === 'com_pendencias' ? 'attention' : 'healthy';

  const metricCards = [
    {
      detail: `${data?.kpis.comandasPagas ?? 0} comanda(s) pagas`,
      key: 'realizado',
      label: 'Realizado',
      tone: 'success',
      value: currency.format(data?.kpis.vendasPagas ?? 0),
    },
    {
      detail: `${data?.kpis.comandasAguardando ?? 0} comanda(s) em aberto`,
      key: 'previsto',
      label: 'A receber',
      tone: 'warning',
      value: currency.format(data?.kpis.vendasPrevistas ?? 0),
    },
    {
      detail: `${currency.format(data?.kpis.valorDesistido ?? 0)} em venda perdida`,
      key: 'desistencias',
      label: 'Desistências',
      tone: 'danger',
      value: numberFormatter.format(data?.kpis.desistencias ?? 0),
    },
    {
      detail: `${data?.retiradas.pendentes ?? 0} pendente(s), ${data?.retiradas.concluidas ?? 0} concluída(s)`,
      key: 'retiradas',
      label: 'Retiradas',
      tone: 'default',
      value: numberFormatter.format((data?.retiradas.pendentes ?? 0) + (data?.retiradas.concluidas ?? 0)),
    },
    {
      detail: `${data?.kpis.taxaConversao ?? 0}% de conversão`,
      key: 'ticket',
      label: 'Ticket médio',
      tone: 'default',
      value: currency.format(data?.kpis.ticketMedio ?? 0),
    },
  ] as const;

  return (
    <main className="page-band finance-report-page">
      <motion.section
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        className="finance-hero"
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
        transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="finance-hero-copy">
          <span className="finance-section-label">Financeiro comercial</span>
          <h1>Mesa Financeira</h1>
          <p>Fechamento, recebíveis e desempenho das lojas em uma leitura pronta para conferência e apresentação.</p>
        </div>

        <div className="finance-hero-status">
          <span>Fechamento</span>
          <strong className={statusTone}>{statusFechamento}</strong>
          <small>Atualizado em {formatDateTime(data?.ultimaAtualizacao)}</small>
        </div>

        <div className="finance-hero-actions">
          <div className="finance-period-tabs" aria-label="Selecionar período">
            {periodOptions.map((option) => (
              <button
                className={periodo === option.value ? 'active' : ''}
                key={option.value}
                onClick={() => {
                  setPeriodo(option.value);
                  setDrilldown(null);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <button className="finance-icon-action" onClick={() => setReload((value) => value + 1)} type="button">
            <RefreshCw size={17} />
            Atualizar
          </button>
        </div>
      </motion.section>

      {error ? <p className="finance-alert">{error}</p> : null}

      <section className="finance-metric-strip" aria-label="Indicadores financeiros">
        {metricCards.map((metric, index) => (
          <motion.button
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            className={`finance-kpi ${metric.tone}`}
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
            key={metric.key}
            onClick={() => {
              const key = metric.key === 'ticket' ? 'realizado' : metric.key;
              void openDrilldown('status', key);
            }}
            transition={{ delay: prefersReducedMotion ? 0 : index * 0.035, duration: 0.2 }}
            type="button"
          >
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </motion.button>
        ))}
      </section>

      <section className="finance-command-grid">
        <article className="finance-canvas-panel">
          <div className="finance-panel-head">
            <div>
              <span className="finance-section-label">Leitura visual</span>
              <h2>Fluxo financeiro do período</h2>
            </div>
            <div className="finance-chart-toolbar">
              {chartModes.map((mode) => (
                <button
                  className={chartMode === mode.value ? 'active' : ''}
                  key={mode.value}
                  onClick={() => setChartMode(mode.value)}
                  type="button"
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="finance-chart-shell">
            {loading ? <div className="finance-chart-loading">Carregando leitura financeira...</div> : null}
            <EChartCanvas
              ariaLabel="Gráfico financeiro com valores realizados, previstos e consolidados"
              className="finance-chart"
              onDataClick={handleChartClick}
              onReady={setChartApi}
              option={chartOption}
            />
          </div>

          <div className="finance-chart-actions">
            <button onClick={exportChartPng} type="button">
              <Download size={17} />
              Exportar gráfico
            </button>
            <button onClick={() => downloadFechamento('pdf')} type="button">
              PDF
            </button>
            <button onClick={() => downloadFechamento('excel')} type="button">
              Excel
            </button>
          </div>
        </article>

        <aside className="finance-reading-panel" aria-live="polite">
          <div className="finance-panel-head compact">
            <div>
              <span className="finance-section-label">Recorte</span>
              <h2>Leitura selecionada</h2>
            </div>
            {drilldown ? (
              <button aria-label="Fechar leitura do recorte" onClick={() => setDrilldown(null)} type="button">
                <X size={18} />
              </button>
            ) : null}
          </div>

          <AnimatePresence mode="wait">
            {drilldownLoading ? (
              <motion.div
                animate={{ opacity: 1 }}
                className="finance-reading-empty"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key="loading"
              >
                <BarChart2 size={24} />
                <strong>Carregando recorte</strong>
                <span>O financeiro está consolidando os valores agregados.</span>
              </motion.div>
            ) : drilldown ? (
              <motion.div
                animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                className="finance-reading-content"
                exit={prefersReducedMotion ? undefined : { opacity: 0, x: 12 }}
                initial={prefersReducedMotion ? undefined : { opacity: 0, x: 12 }}
                key={`${drilldown.dimension}-${drilldown.key}`}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <span className="finance-reading-type">{drilldown.dimension}</span>
                <h3>{drilldown.title}</h3>
                <p>{drilldown.resumo}</p>
                <div className="finance-reading-values">
                  {drilldown.valores.map((value) => (
                    <div className={value.tone || 'default'} key={`${value.label}-${value.value}`}>
                      <span>{value.label}</span>
                      <strong>{formatValue(value.value, value.format)}</strong>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                animate={{ opacity: 1 }}
                className="finance-reading-empty"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key="empty"
              >
                <BarChart2 size={24} />
                <strong>Selecione um dado</strong>
                <span>Clique em indicador, loja, método ou período para abrir a leitura agregada.</span>
              </motion.div>
            )}
          </AnimatePresence>

          {drilldownError ? <p className="finance-inline-error">{drilldownError}</p> : null}
        </aside>
      </section>

      <section className="finance-ledger-grid">
        <article className="finance-ledger-panel">
          <div className="finance-panel-head compact">
            <div>
              <span className="finance-section-label">Comandas</span>
              <h2>Livro operacional</h2>
            </div>
            <strong>{data?.ultimasComandas.length ?? 0}</strong>
          </div>

          <div className="finance-ledger-table">
            <table>
              <thead>
                <tr>
                  <th>Comanda</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {(data?.ultimasComandas ?? []).map((comanda) => (
                  <tr key={comanda.id}>
                    <td>{comanda.codigo}</td>
                    <td>{comanda.cliente}</td>
                    <td><span className={`finance-status-pill ${comanda.status}`}>{statusLabel(comanda.status)}</span></td>
                    <td>{currency.format(comanda.total)}</td>
                    <td>{currency.format(comanda.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && !data.ultimasComandas.length ? (
              <div className="finance-empty-row">Nenhuma comanda no período selecionado.</div>
            ) : null}
          </div>
        </article>

        <article className="finance-ledger-panel compact-list">
          <div className="finance-panel-head compact">
            <div>
              <span className="finance-section-label">Métodos</span>
              <h2>Recebimento</h2>
            </div>
          </div>

          <div className="finance-method-list">
            {(data?.porPagamento ?? []).map((method) => (
              <button key={method.metodo} onClick={() => void openDrilldown('metodo', method.metodo)} type="button">
                <span>{method.metodo}</span>
                <strong>{currency.format(method.total)}</strong>
                <small>{method.quantidade} registro(s)</small>
              </button>
            ))}
            {data && !data.porPagamento.length ? (
              <div className="finance-empty-row">Nenhum pagamento registrado neste período.</div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
};

export default FinancialReportPage;
