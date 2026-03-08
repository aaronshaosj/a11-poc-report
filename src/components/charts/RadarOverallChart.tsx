import ReactECharts from 'echarts-for-react';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

const dimensions = ['里程节降', '时长节降', '满载率', '聚类紧密度', '跨区合理性', '车次节约'];

export default function RadarOverallChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  // Get manual baseline stats
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
    const avgTopK = allVehicles.reduce((sum, v) => sum + v.topKAvg, 0) / n;
    const avgCross = allVehicles.reduce((sum, v) => sum + v.crossRegionCount, 0) / n;
    const vehicleCount = sResults.reduce((sum, r) => sum + r.vehicleCount, 0);

    // Normalize to 0-100 scale
    const distSaving = Math.max(0, ((manualTotalDist - totalDist) / manualTotalDist) * 100 * 8);
    const durSaving = Math.max(0, ((manualTotalDur - totalDur) / manualTotalDur) * 100 * 8);
    const loadScore = Math.min(100, avgLoadRate);
    const clusterScore = Math.min(100, Math.max(0, (10 - avgTopK) * 15));
    const crossScore = Math.min(100, Math.max(0, (3 - avgCross) * 35));
    const vehicleSaving = Math.max(0, ((manualVehicles - vehicleCount) / manualVehicles) * 100 * 10);

    return {
      name: s.name,
      value: [distSaving, durSaving, loadScore, clusterScore, crossScore, vehicleSaving].map(v => +Math.min(100, v).toFixed(1)),
      lineStyle: { color: s.color, width: 2 },
      itemStyle: { color: s.color },
      areaStyle: { color: s.color, opacity: 0.08 },
    };
  });

  const option = {
    ...chartTheme,
    legend: { ...chartTheme.legend, data: strategies.map(s => s.name) },
    tooltip: { ...chartTheme.tooltip },
    radar: {
      indicator: dimensions.map(d => ({ name: d, max: 100 })),
      shape: 'polygon',
      splitNumber: 4,
      center: ['50%', '55%'],
      radius: '65%',
      axisName: { color: '#8b95a8', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1a2340' } },
      splitArea: { areaStyle: { color: ['transparent'] } },
      axisLine: { lineStyle: { color: '#2a3450' } },
    },
    series: [{ type: 'radar', data: seriesData }],
  };

  return <ReactECharts option={option} style={{ height: '100%' }} />;
}
