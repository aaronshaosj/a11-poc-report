import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
import type { SimulationResult, DataAvailability } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
  availability: DataAvailability;
}

interface Dimension {
  key: string;
  label: string;
  check: keyof DataAvailability;
  getValue: (vehicles: { routeSpan: number; crossRegionCount: number; detourRatio?: number; stopCount: number; topKAvg: number; maxStopInterval: number }[]) => number;
  invert: boolean; // true = lower is better
}

const allDimensions: Dimension[] = [
  {
    key: 'routeSpan', label: '路线跨度', check: 'hasRouteSpan', invert: true,
    getValue: (vs) => vs.reduce((s, v) => s + v.routeSpan, 0) / (vs.length || 1),
  },
  {
    key: 'crossRegion', label: '跨区数量', check: 'hasCrossRegion', invert: true,
    getValue: (vs) => vs.reduce((s, v) => s + v.crossRegionCount, 0) / (vs.length || 1),
  },
  {
    key: 'detourRatio', label: '绕行率', check: 'hasDetourRatio', invert: true,
    getValue: (vs) => {
      const vals = vs.map(v => v.detourRatio).filter((v): v is number => v !== undefined);
      return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 100;
    },
  },
  {
    key: 'stopCount', label: '卸货点数', check: 'hasStopInterval', invert: true,
    getValue: (vs) => vs.reduce((s, v) => s + v.stopCount, 0) / (vs.length || 1),
  },
  {
    key: 'topK', label: '聚类紧密度', check: 'hasTopK', invert: true,
    getValue: (vs) => vs.reduce((s, v) => s + v.topKAvg, 0) / (vs.length || 1),
  },
  {
    key: 'stopInterval', label: '点间距', check: 'hasStopInterval', invert: true,
    getValue: (vs) => vs.reduce((s, v) => s + v.maxStopInterval, 0) / (vs.length || 1),
  },
];

export default function FeasibilityRadarChart({ results, strategyIds, availability }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));
  const dims = allDimensions.filter(d => availability[d.check]);

  if (dims.length < 3) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        可用维度不足3个，无法渲染雷达图
      </div>
    );
  }

  // Compute raw values per strategy
  const rawValues = strategies.map(s => {
    const vehicles = results
      .filter(r => r.strategyId === s.id)
      .flatMap(r => r.vehicleDetails);
    return dims.map(d => d.getValue(vehicles));
  });

  // Normalize to 0-100 (lower is better → invert)
  const normalized = rawValues.map(sv =>
    sv.map((v, di) => {
      const col = rawValues.map(row => row[di]);
      const min = Math.min(...col);
      const max = Math.max(...col);
      const range = max - min || 1;
      const norm = ((v - min) / range) * 100;
      return dims[di].invert ? +(100 - norm).toFixed(1) : +norm.toFixed(1);
    })
  );

  const option = {
    ...chartTheme,
    legend: { ...chartTheme.legend, data: strategies.map(s => s.name) },
    tooltip: { ...chartTheme.tooltip },
    radar: {
      indicator: dims.map(d => ({ name: d.label, max: 100 })),
      shape: 'polygon' as const,
      splitNumber: 4,
      center: ['50%', '55%'],
      radius: '65%',
      axisName: { color: '#8b95a8', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1a2340' } },
      splitArea: { areaStyle: { color: ['transparent'] } },
      axisLine: { lineStyle: { color: '#2a3450' } },
    },
    series: [{
      type: 'radar',
      data: strategies.map((s, si) => ({
        name: s.name,
        value: normalized[si],
        lineStyle: { color: s.color, width: 2 },
        itemStyle: { color: s.color },
        areaStyle: { color: s.color, opacity: 0.08 },
      })),
    }],
  };

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '100%' }} />;
}
