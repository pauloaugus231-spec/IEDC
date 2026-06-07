import { useCallback, useEffect, useMemo } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
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
  const handleChartReady = useCallback(
    (chart: EChartsInstance) => {
      onReady?.(chart);
    },
    [onReady],
  );

  useEffect(() => {
    return () => {
      onReady?.(null);
    };
  }, [onReady]);

  const emptyEvents: Record<string, (params: Record<string, unknown>) => void> = {};
  const events = useMemo(() => {
    if (!onDataClick) return emptyEvents;
    return {
      click: (params: Record<string, unknown>) => {
        const dataIndex = Number(params.dataIndex ?? 0);
        if (Number.isFinite(dataIndex)) {
          onDataClick({
            dataIndex,
            seriesIndex: Number(params.seriesIndex ?? 0),
            name: String(params.name ?? ''),
          });
        }
      },
    };
  }, [onDataClick]);

  return (
    <div aria-label={ariaLabel} className={className} role="img" style={{ width: '100%', height: '100%' }}>
      <ReactEChartsCore
        echarts={echarts}
        lazyUpdate
        notMerge={false}
        onChartReady={handleChartReady}
        onEvents={events}
        option={option}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
