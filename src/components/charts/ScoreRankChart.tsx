import ReactECharts from 'echarts-for-react';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

export default function ScoreRankChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  // Calculate composite scores
  const manualResults = results.filter(r => r.strategyId === 's1');
  const manualTotalDist = manualResults.reduce((s, r) => s + r.totalDistance, 0);

  const scores = strategies.map(s => {
    const sResults = results.filter(r => r.strategyId === s.id);
    const totalDist = sResults.reduce((sum, r) => sum + r.totalDistance, 0);
    const allVehicles = sResults.flatMap(r => r.vehicleDetails);
    const n = allVehicles.length || 1;
    const avgLoadRate = allVehicles.reduce((sum, v) => sum + v.loadRate, 0) / n;
    const distSaving = ((manualTotalDist - totalDist) / manualTotalDist) * 100;
    // Weighted composite score
    const score = 50 + distSaving * 2 + (avgLoadRate - 90) * 1.5;
    return { name: s.name, score: +Math.min(100, Math.max(0, score)).toFixed(1), color: s.color };
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
        itemStyle: {
          color: s.color,
          borderRadius: [0, 4, 4, 0],
        },
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

  return <ReactECharts option={option} style={{ height: '100%' }} />;
}
