import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
import type { SimulationResult, ScoringWeights } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme } from '../../lib/chartTheme';
import { calculateAllStrategyScores } from '../../lib/scoring';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
  weights?: ScoringWeights;
}

const dimensions = ['经济性', '约束遵循', '合理性'];

export default function StrategyRadarChart({ results, strategyIds, weights }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));
  const scoreMap = calculateAllStrategyScores(results, strategyIds, weights);

  const seriesData = strategies.map(s => {
    const scores = scoreMap.get(s.id)!;
    return {
      name: s.name,
      value: [scores.economy, scores.constraint, scores.feasibility],
      lineStyle: { color: s.color, width: 2 },
      itemStyle: { color: s.color },
      areaStyle: { color: s.color, opacity: 0.1 },
    };
  });

  const option = {
    ...chartTheme,
    legend: { ...chartTheme.legend, data: strategies.map(s => s.name) },
    tooltip: { ...chartTheme.tooltip },
    radar: {
      indicator: dimensions.map(d => ({ name: d, max: 100 })),
      shape: 'polygon' as const,
      splitNumber: 4,
      center: ['50%', '55%'],
      radius: '65%',
      axisName: { color: '#8b95a8', fontSize: 12 },
      splitLine: { lineStyle: { color: '#1a2340' } },
      splitArea: { areaStyle: { color: ['transparent'] } },
      axisLine: { lineStyle: { color: '#2a3450' } },
    },
    series: [{ type: 'radar', data: seriesData }],
  };

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '100%' }} />;
}
