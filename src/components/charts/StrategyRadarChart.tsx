import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

const dimensions = ['经济性', '约束遵循', '合理性'];

export default function StrategyRadarChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  const manualResults = results.filter(r => r.strategyId === 's1');
  const manualTotalDist = manualResults.reduce((s, r) => s + r.totalDistance, 0);
  const manualTotalDur = manualResults.reduce((s, r) => s + r.totalDuration, 0);
  const manualVehicles = manualResults.reduce((s, r) => s + r.vehicleCount, 0);

  const seriesData = strategies.map(s => {
    const sResults = results.filter(r => r.strategyId === s.id);
    const totalDist = sResults.reduce((sum, r) => sum + r.totalDistance, 0);
    const totalDur = sResults.reduce((sum, r) => sum + r.totalDuration, 0);
    const allVehicles = sResults.flatMap(r => r.vehicleDetails);
    const n = allVehicles.length || 1;
    const avgLoadRate = allVehicles.reduce((sum, v) => sum + v.loadRate, 0) / n;
    const vehicleCount = sResults.reduce((sum, r) => sum + r.vehicleCount, 0);

    // Economic score: based on distance savings, duration savings, load rate, vehicle savings
    const distSaving = ((manualTotalDist - totalDist) / manualTotalDist) * 100;
    const durSaving = ((manualTotalDur - totalDur) / manualTotalDur) * 100;
    const vehicleSaving = ((manualVehicles - vehicleCount) / manualVehicles) * 100;
    const economicScore = Math.min(100, Math.max(0,
      50 + distSaving * 2 + durSaving * 1.5 + (avgLoadRate - 90) * 1.2 + vehicleSaving * 2
    ));

    // Constraint compliance score: 100 - weighted violation rate
    const totalViolations = sResults.reduce((sum, r) => {
      const maxRate = r.constraintViolations.reduce((m, v) => Math.max(m, v.violationRate), 0);
      return sum + maxRate;
    }, 0);
    const avgViolationRate = totalViolations / (sResults.length || 1);
    const constraintScore = Math.min(100, Math.max(0, 100 - avgViolationRate * 3));

    // Feasibility score: based on route span, cross-region, detour ratio, topK
    const avgSpan = allVehicles.reduce((sum, v) => sum + v.routeSpan, 0) / n;
    const avgCross = allVehicles.reduce((sum, v) => sum + v.crossRegionCount, 0) / n;
    const avgTopK = allVehicles.reduce((sum, v) => sum + v.topKAvg, 0) / n;
    const detours = allVehicles.map(v => v.detourRatio).filter((v): v is number => v !== undefined);
    const avgDetour = detours.length > 0 ? detours.reduce((s, v) => s + v, 0) / detours.length : 120;

    const feasibilityScore = Math.min(100, Math.max(0,
      50 + (50 - avgSpan) * 0.8 + (2 - avgCross) * 10 + (5 - avgTopK) * 5 + (120 - avgDetour) * 0.5
    ));

    return {
      name: s.name,
      value: [+economicScore.toFixed(1), +constraintScore.toFixed(1), +feasibilityScore.toFixed(1)],
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
