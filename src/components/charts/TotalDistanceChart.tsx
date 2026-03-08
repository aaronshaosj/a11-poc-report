import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
import type { SimulationResult } from '../../types';
import { mockBatches } from '../../data/mockBatches';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
  batchIds: string[];
}

export default function TotalDistanceChart({ results, strategyIds, batchIds }: Props) {
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
      name: '总里程(km)',
      ...axisStyle,
    },
    series: strategies.map(s => ({
      name: s.name,
      type: 'bar',
      data: batches.map(b => {
        const r = results.find(r => r.batchId === b.id && r.strategyId === s.id);
        return r ? +r.totalDistance.toFixed(0) : 0;
      }),
      itemStyle: { color: s.color, borderRadius: [3, 3, 0, 0] },
      barMaxWidth: 28,
    })),
  };

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '100%' }} />;
}
