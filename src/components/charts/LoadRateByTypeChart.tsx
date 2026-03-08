import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

export default function LoadRateByTypeChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  // Collect all vehicle types
  const vehicleTypes = new Set<string>();
  for (const r of results) {
    if (strategyIds.includes(r.strategyId) && r.avgLoadRateByType) {
      for (const t of Object.keys(r.avgLoadRateByType)) {
        vehicleTypes.add(t);
      }
    }
  }
  const types = Array.from(vehicleTypes).sort();

  const option = {
    ...chartTheme,
    tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
    legend: { ...chartTheme.legend, data: strategies.map(s => s.name) },
    xAxis: {
      type: 'category',
      data: types,
      ...axisStyle,
    },
    yAxis: {
      type: 'value',
      name: '满载率(%)',
      min: 85,
      ...axisStyle,
    },
    series: strategies.map(s => {
      // Aggregate avgLoadRateByType across all batches for this strategy
      const sResults = results.filter(r => r.strategyId === s.id);
      return {
        name: s.name,
        type: 'bar',
        data: types.map(t => {
          const rates = sResults
            .map(r => r.avgLoadRateByType?.[t])
            .filter((v): v is number => v !== undefined);
          return rates.length > 0
            ? +(rates.reduce((sum, v) => sum + v, 0) / rates.length).toFixed(1)
            : 0;
        }),
        itemStyle: { color: s.color, borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 28,
      };
    }),
  };

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '100%' }} />;
}
