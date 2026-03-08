import ReactECharts from 'echarts-for-react';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

const dimensions = ['重量利用率', '体积利用率', '托盘利用率', '件数利用率'];

export default function LoadUtilRadarChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  const seriesData = strategies.map(s => {
    const sResults = results.filter(r => r.strategyId === s.id);
    const allVehicles = sResults.flatMap(r => r.vehicleDetails);
    const n = allVehicles.length || 1;
    return {
      name: s.name,
      value: [
        allVehicles.reduce((sum, v) => sum + v.weightUtil, 0) / n,
        allVehicles.reduce((sum, v) => sum + v.volumeUtil, 0) / n,
        allVehicles.reduce((sum, v) => sum + v.palletUtil, 0) / n,
        allVehicles.reduce((sum, v) => sum + v.qtyUtil, 0) / n,
      ].map(v => +v.toFixed(1)),
      lineStyle: { color: s.color },
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
      shape: 'polygon',
      splitNumber: 4,
      axisName: { color: '#8b95a8', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1a2340' } },
      splitArea: { areaStyle: { color: ['transparent'] } },
      axisLine: { lineStyle: { color: '#2a3450' } },
    },
    series: [{
      type: 'radar',
      data: seriesData,
    }],
  };

  return <ReactECharts option={option} style={{ height: '100%' }} />;
}
