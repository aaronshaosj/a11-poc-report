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
      min: (value: { min: number }) => Math.max(0, Math.floor(value.min - 3)),
      ...axisStyle,
    },
    series: strategies.map(s => {
      const isManual = s.type === 'manual';
      return {
        name: s.name,
        type: 'line',
        data: batches.map(b => {
          const r = results.find(r => r.batchId === b.id && r.strategyId === s.id);
          return r?.avgLoadRate ?? 0;
        }),
        itemStyle: { color: s.color },
        lineStyle: { width: 2, type: isManual ? ('dashed' as const) : ('solid' as const) },
        symbol: 'circle',
        symbolSize: 8,
        smooth: true,
        ...(strategies.length <= 2 ? {
          markPoint: {
            data: [
              { type: 'max' as const, name: '最高' },
              { type: 'min' as const, name: '最低' },
            ],
            symbolSize: 36,
            label: { fontSize: 10 },
          },
        } : {}),
      };
    }),
  };

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '100%' }} />;
}
