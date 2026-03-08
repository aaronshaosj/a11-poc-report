import ReactECharts from 'echarts-for-react';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

const bins = ['0-15', '15-30', '30-45', '45-60', '60-75', '75+'];
const binRanges = [[0, 15], [15, 30], [30, 45], [45, 60], [60, 75], [75, Infinity]];

function histogram(data: number[]): number[] {
  return binRanges.map(([lo, hi]) => data.filter(v => v >= lo && v < hi).length);
}

export default function RouteSpanHistChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  const option = {
    ...chartTheme,
    tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
    legend: { ...chartTheme.legend, data: strategies.map(s => s.name) },
    xAxis: {
      type: 'category',
      data: bins,
      name: '跨度区间(km)',
      ...axisStyle,
    },
    yAxis: {
      type: 'value',
      name: '车次数',
      ...axisStyle,
    },
    series: strategies.map(s => {
      const spans = results
        .filter(r => r.strategyId === s.id)
        .flatMap(r => r.vehicleDetails.map(v => v.routeSpan));
      return {
        name: s.name,
        type: 'bar',
        stack: 'total',
        data: histogram(spans),
        itemStyle: { color: s.color, opacity: 0.7, borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 36,
      };
    }),
  };

  return <ReactECharts option={option} style={{ height: '100%' }} />;
}
