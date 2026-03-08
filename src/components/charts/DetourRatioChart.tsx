import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
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

export default function DetourRatioChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));
  const steps = Array.from({ length: 50 }, (_, i) => 100 + i * 2);

  const option = {
    ...chartTheme,
    tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
    legend: { ...chartTheme.legend, data: strategies.map(s => s.name) },
    xAxis: {
      type: 'category',
      data: steps.map(v => `${v}%`),
      name: '绕行率(%)',
      ...axisStyle,
      axisLabel: { ...axisStyle.axisLabel, interval: 9 },
    },
    yAxis: {
      type: 'value',
      name: '密度',
      ...axisStyle,
    },
    series: strategies.map(s => {
      const ratios = results
        .filter(r => r.strategyId === s.id)
        .flatMap(r => r.vehicleDetails)
        .map(v => v.detourRatio)
        .filter((v): v is number => v !== undefined);
      const density = kde(ratios, 6, steps);
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

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '100%' }} />;
}
