import { useMemo, type CSSProperties } from 'react';
import EChartCanvas, { type IEDCChartOption } from '../../components/EChartCanvas';
import { TOOLTIP_STYLE, AXIS_LABEL_STYLE, GRID_LINE_STYLE, NIVO_COMPAT, IEDC_BLUE_800 } from '../../styles/echarts-theme-iedc';
import type { ImpactoSocialCount } from '../../api';

// ── Helpers ──

export function topItems(items: ImpactoSocialCount[], limit = 6) {
  return [...items].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)).slice(0, limit);
}

export function completeDistribution(items: ImpactoSocialCount[], order: readonly string[]) {
  const map = new Map(items.map((item) => [item.label, item.total]));
  const position = new Map(order.map((label, index) => [label, index]));
  const ordered = order.map((label) => ({ label, total: map.get(label) ?? 0 }));
  const extra = items
    .filter((item) => !order.includes(item.label))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

  return [...ordered, ...extra].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;

    const positionA = position.get(a.label) ?? Number.MAX_SAFE_INTEGER;
    const positionB = position.get(b.label) ?? Number.MAX_SAFE_INTEGER;

    return positionA - positionB || a.label.localeCompare(b.label);
  });
}

export function completeChartSizeClass(items: ImpactoSocialCount[]) {
  if (items.length >= 10) return 'bars-xl';
  if (items.length >= 8) return 'bars-lg';
  return 'bars-md';
}

function compactChartLabel(label: string, maxLength = 42) {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 1).trim()}...`;
}

function compactRadarLabel(label: string) {
  const map: Record<string, string> = {
    'Próximos passos': 'Próximos\npassos',
    Atividades: 'Oficinas',
    Descanso: 'Descanso',
    Comunicação: 'Comunicação',
    Proteção: 'Proteção',
    Vínculo: 'Vínculo',
  };

  return map[label] ?? compactChartLabel(label, 14);
}

export function formatPeriodo(inicio?: string, fim?: string) {
  if (!inicio || !fim) return 'Período em atualização';

  const start = new Date(`${inicio}T12:00:00`);
  const end = new Date(`${fim}T12:00:00`);

  return `${start.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })} a ${end.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;
}

// ── Charts ──

export function ImpactLine({
  points,
}: {
  points: { data: string; respostas: number }[];
}) {
  const labels = points.map((point) => {
    const date = new Date(`${point.data}T12:00:00`);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  });

  const option = useMemo<IEDCChartOption>(
    () => ({
      tooltip: {
        ...TOOLTIP_STYLE,
        trigger: 'axis',
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const p = arr[0] as { name: string; value: number };
          return `Escutas em ${p.name}<br/>${p.value} registros`;
        },
      },
      grid: { left: 46, right: 28, top: 18, bottom: 44, containLabel: false },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...AXIS_LABEL_STYLE, fontWeight: 800 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        splitNumber: 4,
        splitLine: { lineStyle: GRID_LINE_STYLE },
        axisLabel: AXIS_LABEL_STYLE,
      },
      series: [
        {
          type: 'line',
          data: points.map((p) => p.respostas),
          lineStyle: { color: IEDC_BLUE_800, width: 4 },
          areaStyle: { color: 'rgba(0, 65, 170, 0.16)' },
          itemStyle: { color: IEDC_BLUE_800, borderColor: '#ffffff', borderWidth: 3 },
          symbolSize: 10,
          smooth: true,
          animationDuration: 850,
        },
      ],
    }),
    [points, labels],
  );

  return <EChartCanvas ariaLabel="Evolução das escutas de impacto social" option={option} />;
}

export function ImpactDistribution({
  color,
  items,
  unit = 'respostas',
}: {
  color: string;
  items: ImpactoSocialCount[];
  unit?: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.total), 1);
  const total = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="impact-complete-bars">
      {items.map((item, index) => {
        const width = item.total > 0 ? `${Math.max(4, (item.total / maxValue) * 100)}%` : '0%';
        const share = total > 0 ? Math.round((item.total / total) * 100) : 0;
        const style = {
          '--bar-color': color,
          '--bar-delay': `${index * 42}ms`,
          '--bar-width': width,
        } as CSSProperties;

        return (
          <div className={`impact-complete-bar ${item.total === 0 ? 'is-zero' : ''}`} key={item.label} style={style}>
            <div className="impact-complete-bar-row">
              <span>{item.label}</span>
              <strong>
                {item.total}
                <small>{total > 0 ? ` ${share}%` : ` ${unit}`}</small>
              </strong>
            </div>
            <div className="impact-complete-track" aria-label={`${item.label}: ${item.total} ${unit}`}>
              <i />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ImpactRadar({
  items,
}: {
  items: { label: string; valor: number }[];
}) {
  const option = useMemo<IEDCChartOption>(
    () => ({
      tooltip: {
        ...TOOLTIP_STYLE,
        trigger: 'item',
      },
      radar: {
        indicator: items.map((item) => ({
          name: compactRadarLabel(item.label),
          max: 100,
        })),
        axisName: {
          color: NIVO_COMPAT.labelColor,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontSize: 11,
          fontWeight: 850,
        },
        splitLine: { lineStyle: { color: NIVO_COMPAT.gridColor } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: NIVO_COMPAT.gridColor } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: items.map((item) => item.valor),
              name: 'Impacto',
              areaStyle: { color: NIVO_COMPAT.areaColor },
              lineStyle: { color: NIVO_COMPAT.lineColor, width: 3 },
              itemStyle: { color: NIVO_COMPAT.dotColor, borderColor: NIVO_COMPAT.dotBorder, borderWidth: 2 },
              symbolSize: 8,
              label: { show: false },
            },
          ],
          animationDuration: 850,
        },
      ],
    }),
    [items],
  );

  return <EChartCanvas ariaLabel="Radar de dimensões de impacto social" option={option} />;
}
