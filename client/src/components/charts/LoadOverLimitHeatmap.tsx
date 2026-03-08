import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme } from '../../lib/chartTheme';
import type { DataAvailability } from '../../types';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
  availability: DataAvailability;
}

export default function LoadOverLimitHeatmap({ results, strategyIds, availability }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  // Determine active load dimensions
  const dims: { label: string; field: 'weightOverLimit' | 'volumeOverLimit' | 'qtyOverLimit' }[] = [];
  if (availability.hasWeightLimit) dims.push({ label: '重量', field: 'weightOverLimit' });
  if (availability.hasVolumeLimit) dims.push({ label: '体积', field: 'volumeOverLimit' });
  if (availability.hasQtyLimit) dims.push({ label: '件数', field: 'qtyOverLimit' });

  // Build heatmap data: [dimIndex, strategyIndex, violationRate]
  const data: [number, number, number][] = [];
  for (let si = 0; si < strategies.length; si++) {
    const s = strategies[si];
    const allVehicles = results
      .filter(r => r.strategyId === s.id)
      .flatMap(r => r.vehicleDetails);
    const total = allVehicles.length || 1;

    for (let di = 0; di < dims.length; di++) {
      const violated = allVehicles.filter(v => {
        const val = v[dims[di].field];
        return val !== undefined && val > 0;
      }).length;
      data.push([di, si, +(violated / total * 100).toFixed(1)]);
    }
  }

  const option = {
    ...chartTheme,
    tooltip: {
      ...chartTheme.tooltip,
      formatter: (params: { data: [number, number, number] }) => {
        const [di, si, rate] = params.data;
        const allVehicles = results
          .filter(r => r.strategyId === strategies[si].id)
          .flatMap(r => r.vehicleDetails);
        const total = allVehicles.length;
        const violated = Math.round(rate * total / 100);
        return `${strategies[si].name} · ${dims[di].label}<br/>违反率: ${rate}% (${violated}/${total})`;
      },
    },
    grid: { ...chartTheme.grid, left: 120 },
    xAxis: {
      type: 'category',
      data: dims.map(d => d.label),
      splitArea: { show: true },
      axisLine: { lineStyle: { color: '#2a3450' } },
      axisLabel: { color: '#8b95a8', fontSize: 11 },
    },
    yAxis: {
      type: 'category',
      data: strategies.map(s => s.name),
      splitArea: { show: true },
      axisLine: { lineStyle: { color: '#2a3450' } },
      axisLabel: { color: '#8b95a8', fontSize: 11 },
    },
    visualMap: {
      min: 0,
      max: 15,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: {
        color: ['#10b981', '#f59e0b', '#ef4444'],
      },
      textStyle: { color: '#8b95a8' },
      text: ['高违反率', '低违反率'],
    },
    series: [{
      type: 'heatmap',
      data,
      label: {
        show: true,
        color: '#e8ecf4',
        fontSize: 12,
        formatter: (p: { data: [number, number, number] }) => `${p.data[2]}%`,
      },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' },
      },
    }],
  };

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '100%' }} />;
}
