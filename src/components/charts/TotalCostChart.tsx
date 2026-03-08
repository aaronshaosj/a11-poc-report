import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

export default function TotalCostChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  const scores = strategies.map(s => {
    const sResults = results.filter(r => r.strategyId === s.id);
    const totalCost = sResults.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    return { name: s.name, cost: totalCost, color: s.color };
  });

  scores.sort((a, b) => a.cost - b.cost);

  const option = {
    ...chartTheme,
    grid: { ...chartTheme.grid, left: 120 },
    tooltip: {
      ...chartTheme.tooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    xAxis: {
      type: 'value',
      name: '总成本(元)',
      ...axisStyle,
    },
    yAxis: {
      type: 'category',
      data: scores.map(s => s.name),
      inverse: true,
      ...axisStyle,
    },
    series: [{
      type: 'bar',
      data: scores.map(s => ({
        value: s.cost,
        itemStyle: { color: s.color, borderRadius: [0, 4, 4, 0] },
      })),
      barWidth: 24,
      label: {
        show: true,
        position: 'right',
        color: '#e8ecf4',
        fontSize: 12,
        formatter: (p: { value: number }) => `¥${p.value.toLocaleString()}`,
      },
    }],
  };

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '100%' }} />;
}
