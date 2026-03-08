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

export default function SavingsTrendChart({ results, strategyIds, batchIds }: Props) {
  const batches = mockBatches.filter(b => batchIds.includes(b.id));
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id) && s.type === 'algorithm');

  const option = {
    ...chartTheme,
    tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
    legend: { ...chartTheme.legend, data: [...strategies.map(s => s.name), '目标下限', '目标上限'] },
    xAxis: {
      type: 'category',
      data: batches.map(b => b.name),
      ...axisStyle,
    },
    yAxis: {
      type: 'value',
      name: '节降率(%)',
      ...axisStyle,
    },
    series: [
      ...strategies.map(s => ({
        name: s.name,
        type: 'line',
        data: batches.map(b => {
          const manual = results.find(r => r.batchId === b.id && r.strategyId === 's1');
          const algo = results.find(r => r.batchId === b.id && r.strategyId === s.id);
          if (!manual || !algo) return 0;
          return +(((manual.totalDistance - algo.totalDistance) / manual.totalDistance) * 100).toFixed(1);
        }),
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: s.color, width: 2 },
        itemStyle: { color: s.color },
        areaStyle: { color: s.color, opacity: 0.08 },
      })),
      // Target range
      {
        name: '目标下限',
        type: 'line',
        data: batches.map(() => 12),
        lineStyle: { color: '#ef4444', type: 'dashed', width: 1 },
        itemStyle: { color: '#ef4444' },
        symbol: 'none',
      },
      {
        name: '目标上限',
        type: 'line',
        data: batches.map(() => 18),
        lineStyle: { color: '#10b981', type: 'dashed', width: 1 },
        itemStyle: { color: '#10b981' },
        symbol: 'none',
      },
    ],
  };

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '100%' }} />;
}
