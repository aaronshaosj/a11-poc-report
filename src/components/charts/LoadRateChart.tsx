import ReactECharts from 'echarts-for-react';
import type { SimulationResult } from '../../types';
import { mockBatches } from '../../data/mockBatches';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
  batchIds: string[];
}

export default function LoadRateChart({ results, strategyIds, batchIds }: Props) {
  const batches = mockBatches.filter(b => batchIds.includes(b.id));
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  const option = {
    ...chartTheme,
    tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
    legend: { ...chartTheme.legend, data: strategies.map(s => s.name) },
    xAxis: {
      type: 'category',
      data: batches.map(b => b.name),
      ...axisStyle,
    },
    yAxis: {
      type: 'value',
      name: '满载率(%)',
      min: 88,
      ...axisStyle,
    },
    series: strategies.map(s => ({
      name: s.name,
      type: 'line',
      data: batches.map(b => {
        const r = results.find(r => r.batchId === b.id && r.strategyId === s.id);
        return r?.avgLoadRate ?? 0;
      }),
      itemStyle: { color: s.color },
      lineStyle: { width: 2 },
      symbol: 'circle',
      symbolSize: 8,
      smooth: true,
    })),
  };

  return <ReactECharts option={option} style={{ height: '100%' }} />;
}
