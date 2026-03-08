import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

const typeColors = ['#4a9eff', '#34d399', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4'];

export default function VehicleCountByTypeChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  // Collect all vehicle types
  const vehicleTypes = new Set<string>();
  for (const r of results) {
    if (strategyIds.includes(r.strategyId) && r.vehicleCountByType) {
      for (const t of Object.keys(r.vehicleCountByType)) {
        vehicleTypes.add(t);
      }
    }
  }
  const types = Array.from(vehicleTypes).sort();

  const option = {
    ...chartTheme,
    tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
    legend: { ...chartTheme.legend, data: types },
    xAxis: {
      type: 'category',
      data: strategies.map(s => s.name),
      ...axisStyle,
    },
    yAxis: {
      type: 'value',
      name: '车次数',
      ...axisStyle,
    },
    series: types.map((t, ti) => ({
      name: t,
      type: 'bar',
      stack: 'total',
      data: strategies.map(s => {
        const sResults = results.filter(r => r.strategyId === s.id);
        return sResults.reduce((sum, r) => sum + (r.vehicleCountByType?.[t] || 0), 0);
      }),
      itemStyle: {
        color: typeColors[ti % typeColors.length],
        borderRadius: ti === types.length - 1 ? [3, 3, 0, 0] : undefined,
      },
      barMaxWidth: 36,
    })),
  };

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '100%' }} />;
}
