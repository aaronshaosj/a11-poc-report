import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
import type { SimulationResult, ScoringWeights } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';
import { calculateAllStrategyScores } from '../../lib/scoring';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
  weights?: ScoringWeights;
}

export default function StrategyRankChart({ results, strategyIds, weights }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));
  const scoreMap = calculateAllStrategyScores(results, strategyIds, weights);

  const scores = strategies.map(s => {
    const sc = scoreMap.get(s.id)!;
    return { name: s.name, score: sc.overall, color: s.color };
  });

  scores.sort((a, b) => b.score - a.score);

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
      name: '综合评分',
      max: 100,
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
        value: s.score,
        itemStyle: { color: s.color, borderRadius: [0, 4, 4, 0] },
      })),
      barWidth: 24,
      label: {
        show: true,
        position: 'right',
        color: '#e8ecf4',
        fontSize: 12,
        fontWeight: 600,
        formatter: '{c}',
      },
    }],
  };

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '100%' }} />;
}
