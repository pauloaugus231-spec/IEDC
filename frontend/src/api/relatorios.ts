import { useEffect, useState } from 'react';
import { apiFetch } from './http';

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

export interface RelatorioExecutivoKpi {
  id: string;
  label: string;
  value: number | string;
  detail: string;
  tone?: RelatorioExecutivoTone;
  format?: 'number' | 'currency' | 'percent';
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

export interface RelatorioExecutivoAlerta {
  id: string;
  area: 'albergue' | 'creche' | 'financeiro';
  title: string;
  description: string;
  tone: RelatorioExecutivoTone;
  href: string;
  actionLabel: string;
}

export interface RelatorioExecutivoResponse {
  scope: RelatorioExecutivoEscopo;
  generatedAt: string;
  period: {
    escopo: RelatorioExecutivoPeriodo;
    inicio: string;
    fim: string;
    label: string;
  };
  headline: {
    title: string;
    summary: string;
    status: string;
    score: number;
  };
  kpis: RelatorioExecutivoKpi[];
  services: RelatorioExecutivoServico[];
  alerts: RelatorioExecutivoAlerta[];
  reportBlocks: {
    id: string;
    title: string;
    description: string;
    status: string;
    href: string;
  }[];
}

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

export interface RelatorioGestao360Response {
  scope: 'gestao360';
  generatedAt: string;
  period: RelatorioExecutivoResponse['period'];
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
  period: RelatorioExecutivoResponse['period'];
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

export function useRelatorioExecutivo(
  escopo: RelatorioExecutivoEscopo,
  periodo: RelatorioExecutivoPeriodo = 'mes',
) {
  const [data, setData] = useState<RelatorioExecutivoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ escopo, periodo });

    setLoading(true);
    setError(null);
    apiFetch<RelatorioExecutivoResponse>(`/api/relatorios/executivo?${params.toString()}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [escopo, periodo]);

  return { data, loading, error };
}

export function useRelatorioGestao360(
  periodo: RelatorioExecutivoPeriodo = 'mes',
  metric?: Relatorio360MetricId,
  dimension?: Relatorio360DimensionId,
  chart?: Relatorio360ChartType,
  enabled = true,
) {
  const [data, setData] = useState<RelatorioGestao360Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const params = new URLSearchParams({ periodo });
    if (metric) params.set('metric', metric);
    if (dimension) params.set('dimension', dimension);
    if (chart) params.set('chart', chart);

    let active = true;
    setLoading(true);
    setError(null);

    apiFetch<RelatorioGestao360Response>(`/api/relatorios/gestao-360?${params.toString()}`)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [periodo, metric, dimension, chart, enabled]);

  return { data, loading, error };
}

export function useRelatorioGestao360Drilldown(
  periodo: RelatorioExecutivoPeriodo = 'mes',
  metric?: Relatorio360MetricId,
  dimension?: Relatorio360DimensionId,
  key?: string | null,
  enabled = true,
) {
  const [data, setData] = useState<RelatorioGestao360DrilldownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !metric || !dimension || !key) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const params = new URLSearchParams({
      periodo,
      metric,
      dimension,
      key,
    });

    let active = true;
    setLoading(true);
    setError(null);

    apiFetch<RelatorioGestao360DrilldownResponse>(`/api/relatorios/gestao-360/drilldown?${params.toString()}`)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [periodo, metric, dimension, key, enabled]);

  return { data, loading, error };
}
