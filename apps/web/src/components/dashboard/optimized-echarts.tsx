import ReactEChartsCore from 'echarts-for-react/esm/core';

import * as echarts from 'echarts/core';

import {
  BarChart,
  LineChart,
} from 'echarts/charts';

import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';

import {
  CanvasRenderer,
} from 'echarts/renderers';

import type {
  EChartsCoreOption,
} from 'echarts/core';

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

interface OptimizedEChartsProps {
  option: EChartsCoreOption;
  height?: number;
}

export function OptimizedECharts({
  option,
  height = 380,
}: OptimizedEChartsProps) {
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge
      lazyUpdate
      style={{
        width: '100%',
        height: `${height}px`,
      }}
    />
  );
}