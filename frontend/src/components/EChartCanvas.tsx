import { useEffect, useRef } from 'react';
import { BarChart, LineChart, PieChart, RadarChart, type BarSeriesOption, type LineSeriesOption, type PieSeriesOption, type RadarSeriesOption } from 'echarts/charts';
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  PolarComponent,
  RadarComponent,
  TooltipComponent,
  type AriaComponentOption,
  type GridComponentOption,
  type LegendComponentOption,
  type PolarComponentOption,
  type RadarComponentOption,
  type TooltipComponentOption,
} from 'echarts/components';
import { type ComposeOption } from 'echarts/core';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  AriaComponent,
  BarChart,
  CanvasRenderer,
  GridComponent,
  LegendComponent,
  LineChart,
  PieChart,
  PolarComponent,
  RadarChart,
  RadarComponent,
  TooltipComponent,
]);

export type IEDCChartOption = ComposeOption<
  | AriaComponentOption
  | BarSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | LineSeriesOption
  | PieSeriesOption
  | PolarComponentOption
  | RadarComponentOption
  | RadarSeriesOption
  | TooltipComponentOption
>;

export type EChartsInstance = ReturnType<typeof echarts.init>;

type EChartCanvasProps = {
  ariaLabel: string;
  className?: string;
  onDataClick?: (params: { dataIndex: number; seriesIndex: number; name: string }) => void;
  onReady?: (chart: EChartsInstance | null) => void;
  option: IEDCChartOption;
};

export default function EChartCanvas({ ariaLabel, className, onDataClick, onReady, option }: EChartCanvasProps) {
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
        const p = params as { dataIndex?: number; seriesIndex?: number; name?: string };
        const dataIndex = Number(p.dataIndex);
        if (Number.isFinite(dataIndex)) {
          onDataClick({
            dataIndex,
            seriesIndex: Number(p.seriesIndex ?? 0),
            name: String(p.name ?? ''),
          });
        }
      }
    };

    chart.on('click', handler);
    return () => {
      chart.off('click', handler);
    };
  }, [onDataClick]);

  return <div aria-label={ariaLabel} className={className} ref={elementRef} role="img" style={{ width: '100%', height: '100%' }} />;
}
