import ReactECharts from 'echarts-for-react';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

export default function StrategyRankChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  const manualResults = results.filter(r => r.strategyId === 's1');
  const manualTotalDist = manualResults.reduce((s, r) => s + r.totalDistance, 0);
  const manualTotalDur = manualResults.reduce((s, r) => s + r.totalDuration, 0);
  const manualVehicles = manualResults.reduce((s, r) => s + r.vehicleCount, 0);

  const scores = strategies.map(s => {
    const sResults = results.filter(r => r.strategyId === s.id);
    const totalDist = sResults.reduce((sum, r) => sum + r.totalDistance, 0);
    const totalDur = sResults.reduce((sum, r) => sum + r.totalDuration, 0);
    const allVehicles = sResults.flatMap(r => r.vehicleDetails);
    const n = allVehicles.length || 1;
    const avgLoadRate = allVehicles.reduce((sum, v) => sum + v.loadRate, 0) / n;
    const vehicleCount = sResults.reduce((sum, r) => sum + r.vehicleCount, 0);

    const distSaving = ((manualTotalDist - totalDist) / manualTotalDist) * 100;
    const durSaving = ((manualTotalDur - totalDur) / manualTotalDur) * 100;
    const vehicleSaving = ((manualVehicles - vehicleCount) / manualVehicles) * 100;
    const economicScore = Math.min(100, Math.max(0,
      50 + distSaving * 2 + durSaving * 1.5 + (avgLoadRate - 90) * 1.2 + vehicleSaving * 2
    ));

    const totalViolations = sResults.reduce((sum, r) => {
      const maxRate = r.constraintViolations.reduce((m, v) => Math.max(m, v.violationRate), 0);
      return sum + maxRate;
    }, 0);
    const avgViolationRate = totalViolations / (sResults.length || 1);
    const constraintScore = Math.min(100, Math.max(0, 100 - avgViolationRate * 3));

    const avgSpan = allVehicles.reduce((sum, v) => sum + v.routeSpan, 0) / n;
    const avgCross = allVehicles.reduce((sum, v) => sum + v.crossRegionCount, 0) / n;
    const avgTopK = allVehicles.reduce((sum, v) => sum + v.topKAvg, 0) / n;
    const detours = allVehicles.map(v => v.detourRatio).filter((v): v is number => v !== undefined);
    const avgDetour = detours.length > 0 ? detours.reduce((s, v) => s + v, 0) / detours.length : 120;

    const feasibilityScore = Math.min(100, Math.max(0,
      50 + (50 - avgSpan) * 0.8 + (2 - avgCross) * 10 + (5 - avgTopK) * 5 + (120 - avgDetour) * 0.5
    ));

    // Weighted composite: economic 40%, constraint 30%, feasibility 30%
    const composite = economicScore * 0.4 + constraintScore * 0.3 + feasibilityScore * 0.3;

    return { name: s.name, score: +composite.toFixed(1), color: s.color };
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

  return <ReactECharts option={option} style={{ height: '100%' }} />;
}
