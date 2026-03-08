import ReactECharts from 'echarts-for-react';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

function computeCDF(data: number[], steps: number[]): number[] {
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length || 1;
  return steps.map(x => {
    const count = sorted.filter(v => v <= x).length;
    return +(count / n).toFixed(4);
  });
}

export default function IntervalCDFChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));
  const steps = Array.from({ length: 30 }, (_, i) => i + 1);

  const option = {
    ...chartTheme,
    tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
    legend: { ...chartTheme.legend, data: strategies.map(s => s.name) },
    xAxis: {
      type: 'category',
      data: steps.map(String),
      name: '距离(km)',
      ...axisStyle,
      axisLabel: { ...axisStyle.axisLabel, interval: 4 },
    },
    yAxis: {
      type: 'value',
      name: '累积概率',
      max: 1,
      ...axisStyle,
    },
    series: strategies.map(s => {
      const intervals = results
        .filter(r => r.strategyId === s.id)
        .flatMap(r => r.vehicleDetails.map(v => v.maxStopInterval));
      const cdf = computeCDF(intervals, steps);
      return {
        name: s.name,
        type: 'line',
        data: cdf,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: s.color, width: 2 },
        itemStyle: { color: s.color },
      };
    }),
  };

  return <ReactECharts option={option} style={{ height: '100%' }} />;
}
