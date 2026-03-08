import ReactECharts from 'echarts-for-react';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

/** Simple KDE approximation using gaussian kernel */
function kde(data: number[], bandwidth: number, steps: number[]): number[] {
  const n = data.length || 1;
  return steps.map(x => {
    const sum = data.reduce((acc, xi) => {
      const z = (x - xi) / bandwidth;
      return acc + Math.exp(-0.5 * z * z);
    }, 0);
    return +(sum / (n * bandwidth * Math.sqrt(2 * Math.PI))).toFixed(6);
  });
}

export default function DistanceDensityChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));
  const steps = Array.from({ length: 60 }, (_, i) => 10 + i * 3);

  const option = {
    ...chartTheme,
    tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
    legend: { ...chartTheme.legend, data: strategies.map(s => s.name) },
    xAxis: {
      type: 'category',
      data: steps.map(String),
      ...axisStyle,
      name: '距离(km)',
      axisLabel: {
        ...axisStyle.axisLabel,
        interval: 9,
      },
    },
    yAxis: {
      type: 'value',
      name: '密度',
      ...axisStyle,
    },
    series: strategies.map(s => {
      const allDist = results
        .filter(r => r.strategyId === s.id)
        .flatMap(r => r.vehicleDetails.map(v => v.distance));
      const density = kde(allDist, 12, steps);
      return {
        name: s.name,
        type: 'line',
        data: density,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: s.color, width: 2 },
        itemStyle: { color: s.color },
        areaStyle: { color: s.color, opacity: 0.05 },
      };
    }),
  };

  return <ReactECharts option={option} style={{ height: '100%' }} />;
}
