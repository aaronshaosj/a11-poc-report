import type { PocReport, SimulationResult, Strategy, OrderBatch, DataAvailability } from '../types';
import { getInsight } from './insightGenerator';
import { calculateAllStrategyScores } from './scoring';
import { hasZeroViolations } from '../hooks/useChartDataValidity';

interface NavSection {
  id: string;
  label: string;
  count?: number;
}

// ─── shouldRender helpers (mirrors ReportDetailPage.tsx) ───

function shouldRenderE5(a: DataAvailability) { return a.hasMultiVehicleTypes; }
function shouldRenderE6(a: DataAvailability) { return a.hasMultiVehicleTypes; }
function shouldRenderE7(a: DataAvailability) { return a.hasCostStructure; }
function shouldRenderE8(a: DataAvailability, hasMultiBatches: boolean) { return a.hasMultiBatches && hasMultiBatches; }
function shouldRenderC2(a: DataAvailability) { return a.hasDurationLimit; }
function shouldRenderC3(a: DataAvailability) { return a.hasDistanceLimit; }
function shouldRenderC4(a: DataAvailability) { return a.hasWeightLimit || a.hasVolumeLimit || a.hasQtyLimit; }
function shouldRenderF1(a: DataAvailability) { return a.hasRouteSpan; }
function shouldRenderF2(a: DataAvailability) { return a.hasCrossRegion; }
function shouldRenderF3(a: DataAvailability) { return a.hasDetourRatio; }
function shouldRenderF5(a: DataAvailability) { return a.hasTopK; }
function shouldRenderF6(a: DataAvailability) { return a.hasStopInterval; }
function shouldRenderF7(a: DataAvailability) {
  return [a.hasRouteSpan, a.hasCrossRegion, a.hasDetourRatio, a.hasTopK, a.hasStopInterval].filter(Boolean).length >= 3;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Boxplot statistics ───

function boxplotStats(arr: number[]): [number, number, number, number, number] {
  if (arr.length === 0) return [0, 0, 0, 0, 0];
  const sorted = [...arr].sort((a, b) => a - b);
  const q = (p: number) => {
    const i = (sorted.length - 1) * p;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    return lo === hi ? sorted[lo] : sorted[lo] * (hi - i) + sorted[hi] * (i - lo);
  };
  return [+sorted[0].toFixed(1), +q(0.25).toFixed(1), +q(0.5).toFixed(1), +q(0.75).toFixed(1), +sorted[sorted.length - 1].toFixed(1)];
}

// ─── Chart option builders (return JSON-serializable ECharts options) ───

interface ChartDef {
  id: string;
  title: string;
  section: string;
  option: Record<string, unknown>;
  insight: string;
  height?: number;
}

const baseTheme = {
  backgroundColor: 'transparent',
  textStyle: { color: '#8b95a8' },
  legend: { textStyle: { color: '#8b95a8', fontSize: 11 }, icon: 'roundRect', itemWidth: 12, itemHeight: 8, top: 8, right: 8 },
  tooltip: { backgroundColor: 'rgba(15,22,41,0.95)', borderColor: 'rgba(100,140,200,0.2)', textStyle: { color: '#e8ecf4', fontSize: 12 } },
  grid: { left: 60, right: 20, top: 60, bottom: 40, containLabel: false },
};

const axisStyle = {
  axisLine: { lineStyle: { color: '#2a3450' } },
  axisTick: { lineStyle: { color: '#2a3450' } },
  axisLabel: { color: '#8b95a8', fontSize: 11 },
  splitLine: { lineStyle: { color: '#1a2340', type: 'dashed' } },
  nameTextStyle: { color: '#8b95a8', fontSize: 11 },
};

// Grouped bar chart (E1, E2, E3, E5, C1)
function makeGroupedBar(
  categories: string[],
  series: { name: string; data: number[]; color: string }[],
  yName: string,
  yMin?: number,
): Record<string, unknown> {
  return {
    ...baseTheme,
    legend: { ...baseTheme.legend, data: series.map(s => s.name) },
    tooltip: { ...baseTheme.tooltip, trigger: 'axis' },
    xAxis: { type: 'category', data: categories, ...axisStyle },
    yAxis: { type: 'value', name: yName, min: yMin, ...axisStyle },
    series: series.map(s => ({
      name: s.name, type: 'bar', data: s.data, barMaxWidth: 28,
      itemStyle: { color: s.color, borderRadius: [3, 3, 0, 0] },
    })),
  };
}

function buildE1(results: SimulationResult[], strategies: Strategy[], batches: OrderBatch[]): Record<string, unknown> {
  const categories = batches.map(b => b.name);
  const series = strategies.map(s => ({
    name: s.name, color: s.color,
    data: batches.map(b => results.find(r => r.batchId === b.id && r.strategyId === s.id)?.vehicleCount || 0),
  }));
  return makeGroupedBar(categories, series, '车次数');
}

function buildE2(results: SimulationResult[], strategies: Strategy[], batches: OrderBatch[]): Record<string, unknown> {
  const categories = batches.map(b => b.name);
  const series = strategies.map(s => ({
    name: s.name, color: s.color,
    data: batches.map(b => +(results.find(r => r.batchId === b.id && r.strategyId === s.id)?.totalDistance || 0).toFixed(0)),
  }));
  return makeGroupedBar(categories, series, '总里程(km)');
}

function buildE3(results: SimulationResult[], strategies: Strategy[], batches: OrderBatch[]): Record<string, unknown> {
  const categories = batches.map(b => b.name);
  const series = strategies.map(s => ({
    name: s.name, color: s.color,
    data: batches.map(b => +(results.find(r => r.batchId === b.id && r.strategyId === s.id)?.totalDuration || 0).toFixed(0)),
  }));
  return makeGroupedBar(categories, series, '总工作时长(min)');
}

function buildE4(results: SimulationResult[], strategies: Strategy[], batches: OrderBatch[]): Record<string, unknown> {
  const categories = batches.map(b => b.name);
  const allRates: number[] = [];
  const series = strategies.map(s => {
    const data = batches.map(b => {
      const v = results.find(r => r.batchId === b.id && r.strategyId === s.id)?.avgLoadRate || 0;
      allRates.push(v);
      return +v.toFixed(1);
    });
    return {
      name: s.name, type: 'line', smooth: true, symbol: 'circle', symbolSize: 8,
      data,
      itemStyle: { color: s.color },
      lineStyle: { width: 2, type: s.type === 'manual' ? 'dashed' : 'solid' },
    };
  });
  const yMin = Math.max(0, Math.floor(Math.min(...allRates) - 3));
  return {
    ...baseTheme,
    legend: { ...baseTheme.legend, data: strategies.map(s => s.name) },
    tooltip: { ...baseTheme.tooltip, trigger: 'axis' },
    xAxis: { type: 'category', data: categories, ...axisStyle },
    yAxis: { type: 'value', name: '满载率(%)', min: yMin, ...axisStyle },
    series,
  };
}

function buildE5(results: SimulationResult[], strategies: Strategy[]): Record<string, unknown> {
  const types = new Set<string>();
  results.forEach(r => Object.keys(r.avgLoadRateByType || {}).forEach(t => types.add(t)));
  const typeArr = Array.from(types).sort();
  const series = strategies.map(s => ({
    name: s.name, color: s.color,
    data: typeArr.map(t => {
      const rs = results.filter(r => r.strategyId === s.id);
      const vals = rs.map(r => r.avgLoadRateByType?.[t]).filter((v): v is number => v != null);
      return vals.length > 0 ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0;
    }),
  }));
  return makeGroupedBar(typeArr, series, '满载率(%)', 85);
}

function buildE6(results: SimulationResult[], strategies: Strategy[]): Record<string, unknown> {
  const types = new Set<string>();
  results.forEach(r => Object.keys(r.vehicleCountByType || {}).forEach(t => types.add(t)));
  const typeArr = Array.from(types).sort();
  const typeColors = ['#4a9eff', '#34d399', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4'];
  return {
    ...baseTheme,
    legend: { ...baseTheme.legend, data: typeArr },
    tooltip: { ...baseTheme.tooltip, trigger: 'axis' },
    xAxis: { type: 'category', data: strategies.map(s => s.name), ...axisStyle },
    yAxis: { type: 'value', name: '车次数', ...axisStyle },
    series: typeArr.map((t, ti) => ({
      name: t, type: 'bar', stack: 'total', barMaxWidth: 36,
      data: strategies.map(s => results.filter(r => r.strategyId === s.id).reduce((sum, r) => sum + (r.vehicleCountByType?.[t] || 0), 0)),
      itemStyle: { color: typeColors[ti % typeColors.length] },
    })),
  };
}

function buildE7(results: SimulationResult[], strategies: Strategy[]): Record<string, unknown> {
  const data = strategies.map(s => {
    const total = results.filter(r => r.strategyId === s.id).reduce((sum, r) => sum + (r.totalCost || 0), 0);
    return { name: s.name, value: +total.toFixed(0), color: s.color };
  }).sort((a, b) => b.value - a.value);
  return {
    ...baseTheme,
    grid: { ...baseTheme.grid, left: 120 },
    tooltip: { ...baseTheme.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', name: '总成本(元)', ...axisStyle },
    yAxis: { type: 'category', data: data.map(d => d.name), inverse: true, ...axisStyle },
    series: [{ type: 'bar', data: data.map(d => ({ value: d.value, itemStyle: { color: d.color, borderRadius: [0, 4, 4, 0] } })), barWidth: 24 }],
  };
}

function buildE8(results: SimulationResult[], strategies: Strategy[], batches: OrderBatch[]): Record<string, unknown> {
  const manualResults = results.filter(r => r.strategyId === 's1');
  const algoStrategies = strategies.filter(s => s.type === 'algorithm');
  const categories = batches.map(b => b.name);
  const series = algoStrategies.map(s => {
    const data = batches.map(b => {
      const mR = manualResults.find(r => r.batchId === b.id);
      const aR = results.find(r => r.batchId === b.id && r.strategyId === s.id);
      if (!mR || !aR || mR.totalDistance === 0) return 0;
      return +((mR.totalDistance - aR.totalDistance) / mR.totalDistance * 100).toFixed(1);
    });
    return {
      name: s.name, type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
      data, itemStyle: { color: s.color }, lineStyle: { width: 2 },
      areaStyle: { color: s.color, opacity: 0.08 },
    };
  });
  return {
    ...baseTheme,
    legend: { ...baseTheme.legend, data: algoStrategies.map(s => s.name) },
    tooltip: { ...baseTheme.tooltip, trigger: 'axis' },
    xAxis: { type: 'category', data: categories, ...axisStyle },
    yAxis: { type: 'value', name: '节降率(%)', ...axisStyle },
    series,
  };
}

function buildC1(results: SimulationResult[], strategies: Strategy[]): Record<string, unknown> {
  const constraintTypes = new Set<string>();
  results.forEach(r => r.constraintViolations.forEach(v => { if (v.violatedCount > 0) constraintTypes.add(v.type); }));
  const typeArr = Array.from(constraintTypes);
  if (typeArr.length === 0) return makeGroupedBar(['无违反'], [{ name: '-', data: [0], color: '#444' }], '违反率(%)');
  const series = strategies.map(s => ({
    name: s.name, color: s.color,
    data: typeArr.map(t => {
      const rs = results.filter(r => r.strategyId === s.id);
      const violations = rs.flatMap(r => r.constraintViolations).filter(v => v.type === t);
      if (violations.length === 0) return 0;
      const totalViolated = violations.reduce((sum, v) => sum + v.violatedCount, 0);
      const totalCount = violations.reduce((sum, v) => sum + v.totalCount, 0);
      return totalCount > 0 ? +(totalViolated / totalCount * 100).toFixed(1) : 0;
    }),
  }));
  return makeGroupedBar(typeArr, series, '违反率(%)');
}

function buildBoxplot(
  results: SimulationResult[], strategies: Strategy[],
  field: 'durationOverLimit' | 'distanceOverLimit', yName: string
): Record<string, unknown> {
  const data: { name: string; stats: [number, number, number, number, number]; color: string }[] = [];
  for (const s of strategies) {
    const details = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails);
    const vals = details.map(d => d[field]).filter((v): v is number => v != null && v > 0);
    data.push({ name: `${s.name}(${vals.length})`, stats: boxplotStats(vals), color: s.color });
  }
  return {
    ...baseTheme,
    tooltip: { ...baseTheme.tooltip, trigger: 'item' },
    xAxis: { type: 'category', data: data.map(d => d.name), ...axisStyle },
    yAxis: { type: 'value', name: yName, ...axisStyle },
    series: [{
      type: 'boxplot',
      data: data.map(d => ({
        value: d.stats,
        itemStyle: { color: 'transparent', borderColor: d.color, borderWidth: 2 },
      })),
    }],
  };
}

function buildC4(results: SimulationResult[], strategies: Strategy[], availability: DataAvailability): Record<string, unknown> {
  const dims: { key: 'weightOverLimit' | 'volumeOverLimit' | 'qtyOverLimit'; label: string; check: boolean }[] = [
    { key: 'weightOverLimit', label: '重量', check: availability.hasWeightLimit },
    { key: 'volumeOverLimit', label: '体积', check: availability.hasVolumeLimit },
    { key: 'qtyOverLimit', label: '件数', check: availability.hasQtyLimit },
  ];
  const activeDims = dims.filter(d => d.check);
  const data: [number, number, number][] = [];
  for (let si = 0; si < strategies.length; si++) {
    const details = results.filter(r => r.strategyId === strategies[si].id).flatMap(r => r.vehicleDetails);
    const total = details.length;
    for (let di = 0; di < activeDims.length; di++) {
      const violated = details.filter(d => { const v = d[activeDims[di].key]; return v != null && v > 0; }).length;
      data.push([di, si, total > 0 ? +(violated / total * 100).toFixed(1) : 0]);
    }
  }
  return {
    ...baseTheme,
    grid: { ...baseTheme.grid, left: 120 },
    tooltip: { ...baseTheme.tooltip },
    xAxis: { type: 'category', data: activeDims.map(d => d.label), ...axisStyle, splitArea: { show: true, areaStyle: { color: ['transparent'] } } },
    yAxis: { type: 'category', data: strategies.map(s => s.name), ...axisStyle, splitArea: { show: true, areaStyle: { color: ['transparent'] } } },
    visualMap: { min: 0, max: 15, calculable: true, orient: 'horizontal', left: 'center', top: 0, inRange: { color: ['#1a3a2a', '#f59e0b', '#ef4444'] }, textStyle: { color: '#8b95a8' } },
    series: [{ type: 'heatmap', data, label: { show: true, color: '#e8ecf4', fontSize: 11, formatter: (p: { value: [number, number, number] }) => p.value[2] + '%' } }],
  };
}

function buildC5(results: SimulationResult[], strategies: Strategy[]): Record<string, unknown> {
  const constraintLabels = ['工作时长', '行驶里程', '装载重量', '装载体积', '装载件数', '跨区数量', '卸货点数'];
  const fields: (keyof import('../types').VehicleDetail)[] = ['durationOverLimit', 'distanceOverLimit', 'weightOverLimit', 'volumeOverLimit', 'qtyOverLimit', 'crossRegionOverLimit', 'stopOverLimit'];
  const series = strategies.map(s => {
    const details = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails);
    const data: [number, number, number][] = [];
    for (let ci = 0; ci < fields.length; ci++) {
      for (const d of details) {
        const v = d[fields[ci]] as number | undefined;
        if (v != null && v > 0) data.push([+v.toFixed(1), ci, Math.min(30, 5 + v * 0.3)]);
      }
    }
    return { name: s.name, type: 'scatter', data, itemStyle: { color: s.color, opacity: 0.7 }, symbolSize: (v: [number, number, number]) => v[2] };
  });
  return {
    ...baseTheme,
    legend: { ...baseTheme.legend, data: strategies.map(s => s.name) },
    tooltip: { ...baseTheme.tooltip },
    xAxis: { type: 'value', name: '超限幅度', ...axisStyle },
    yAxis: { type: 'category', data: constraintLabels, ...axisStyle },
    series,
  };
}

function buildF1(results: SimulationResult[], strategies: Strategy[]): Record<string, unknown> {
  const categories = strategies.map(s => s.name);
  const boxData = strategies.map(s => {
    const spans = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails.map(v => v.routeSpan));
    return { stats: boxplotStats(spans), color: s.color };
  });
  return {
    ...baseTheme,
    tooltip: { ...baseTheme.tooltip, trigger: 'item' },
    xAxis: { type: 'category', data: categories, ...axisStyle },
    yAxis: { type: 'value', name: '路线跨度(km)', ...axisStyle },
    series: [{
      type: 'boxplot',
      data: boxData.map(d => ({
        value: d.stats,
        itemStyle: { color: 'transparent', borderColor: d.color, borderWidth: 2 },
      })),
    }],
  };
}

function buildF2(results: SimulationResult[], strategies: Strategy[]): Record<string, unknown> {
  const regionLabels = ['不跨区', '跨1区', '跨2区', '跨3+区'];
  const regionColors = ['#34d399', '#4a9eff', '#f59e0b', '#ef4444'];
  return {
    ...baseTheme,
    legend: { ...baseTheme.legend, data: regionLabels },
    tooltip: { ...baseTheme.tooltip, trigger: 'axis' },
    xAxis: { type: 'category', data: strategies.map(s => s.name), ...axisStyle },
    yAxis: { type: 'value', name: '车次数', ...axisStyle },
    series: regionLabels.map((label, li) => ({
      name: label, type: 'bar', stack: 'total', barMaxWidth: 36,
      data: strategies.map(s => {
        const details = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails);
        if (li === 0) return details.filter(v => v.crossRegionCount === 0).length;
        if (li === 1) return details.filter(v => v.crossRegionCount === 1).length;
        if (li === 2) return details.filter(v => v.crossRegionCount === 2).length;
        return details.filter(v => v.crossRegionCount >= 3).length;
      }),
      itemStyle: { color: regionColors[li] },
    })),
  };
}

function buildF3(results: SimulationResult[], strategies: Strategy[]): Record<string, unknown> {
  // KDE-like histogram as line chart
  const xLabels: string[] = [];
  for (let i = 100; i <= 198; i += 2) xLabels.push(i + '%');
  const series = strategies.map(s => {
    const ratios = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails.map(v => v.detourRatio)).filter((v): v is number => v != null);
    const bandwidth = 6;
    const data = xLabels.map((_, xi) => {
      const x = 100 + xi * 2;
      let density = 0;
      for (const r of ratios) {
        const z = (x - r) / bandwidth;
        density += Math.exp(-0.5 * z * z) / (bandwidth * Math.sqrt(2 * Math.PI));
      }
      return +(density / (ratios.length || 1)).toFixed(4);
    });
    return {
      name: s.name, type: 'line', smooth: true, showSymbol: false, data,
      itemStyle: { color: s.color }, lineStyle: { width: 2 },
      areaStyle: { color: s.color, opacity: 0.05 },
    };
  });
  return {
    ...baseTheme,
    legend: { ...baseTheme.legend, data: strategies.map(s => s.name) },
    tooltip: { ...baseTheme.tooltip, trigger: 'axis' },
    xAxis: { type: 'category', data: xLabels, ...axisStyle, axisLabel: { ...axisStyle.axisLabel, interval: 9 } },
    yAxis: { type: 'value', name: '密度', ...axisStyle },
    series,
  };
}

function buildF4(results: SimulationResult[], strategies: Strategy[]): Record<string, unknown> {
  const boxData = strategies.map(s => {
    const stops = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails.map(v => v.stopCount));
    return { stats: boxplotStats(stops), color: s.color };
  });
  return {
    ...baseTheme,
    tooltip: { ...baseTheme.tooltip, trigger: 'item' },
    xAxis: { type: 'category', data: strategies.map(s => s.name), ...axisStyle },
    yAxis: { type: 'value', name: '卸货点数', ...axisStyle },
    series: [{
      type: 'boxplot',
      data: boxData.map(d => ({
        value: d.stats,
        itemStyle: { color: 'transparent', borderColor: d.color, borderWidth: 2 },
      })),
    }],
  };
}

function buildF5(results: SimulationResult[], strategies: Strategy[]): Record<string, unknown> {
  const series = strategies.map(s => {
    const details = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails);
    return {
      name: s.name, type: 'scatter', symbolSize: 6,
      data: details.map((d, i) => [i, +d.topKAvg.toFixed(2)]),
      itemStyle: { color: s.color, opacity: 0.6 },
    };
  });
  return {
    ...baseTheme,
    legend: { ...baseTheme.legend, data: strategies.map(s => s.name) },
    tooltip: { ...baseTheme.tooltip },
    xAxis: { type: 'value', name: '车次编号', ...axisStyle },
    yAxis: { type: 'value', name: 'Top-3均值(km)', ...axisStyle },
    series,
  };
}

function buildF6(results: SimulationResult[], strategies: Strategy[]): Record<string, unknown> {
  const bins: number[] = [];
  for (let i = 1; i <= 30; i++) bins.push(i);
  const series = strategies.map(s => {
    const intervals = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails.map(v => v.maxStopInterval));
    intervals.sort((a, b) => a - b);
    const total = intervals.length || 1;
    const data = bins.map(b => {
      const count = intervals.filter(v => v <= b).length;
      return +(count / total).toFixed(3);
    });
    return {
      name: s.name, type: 'line', smooth: true, showSymbol: false, data,
      itemStyle: { color: s.color }, lineStyle: { width: 2 },
    };
  });
  return {
    ...baseTheme,
    legend: { ...baseTheme.legend, data: strategies.map(s => s.name) },
    tooltip: { ...baseTheme.tooltip, trigger: 'axis' },
    xAxis: { type: 'category', data: bins.map(b => b + 'km'), ...axisStyle, axisLabel: { ...axisStyle.axisLabel, interval: 4 } },
    yAxis: { type: 'value', name: '累积概率', max: 1, ...axisStyle },
    series,
  };
}

function buildF7(results: SimulationResult[], strategies: Strategy[], availability: DataAvailability): Record<string, unknown> {
  interface Dim { label: string; check: keyof DataAvailability; getValue: (vs: import('../types').VehicleDetail[]) => number; }
  const allDims: Dim[] = [
    { label: '路线跨度', check: 'hasRouteSpan', getValue: vs => vs.reduce((s, v) => s + v.routeSpan, 0) / (vs.length || 1) },
    { label: '跨区数量', check: 'hasCrossRegion', getValue: vs => vs.reduce((s, v) => s + v.crossRegionCount, 0) / (vs.length || 1) },
    { label: '绕行率', check: 'hasDetourRatio', getValue: vs => { const vals = vs.map(v => v.detourRatio).filter((v): v is number => v != null); return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 100; } },
    { label: '聚类紧密度', check: 'hasTopK', getValue: vs => vs.reduce((s, v) => s + v.topKAvg, 0) / (vs.length || 1) },
    { label: '点间距', check: 'hasStopInterval', getValue: vs => vs.reduce((s, v) => s + v.maxStopInterval, 0) / (vs.length || 1) },
  ];
  const dims = allDims.filter(d => availability[d.check]);
  const rawValues = strategies.map(s => {
    const vs = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails);
    return dims.map(d => d.getValue(vs));
  });
  const normalized = rawValues.map(sv => sv.map((v, di) => {
    const col = rawValues.map(row => row[di]);
    const min = Math.min(...col); const max = Math.max(...col);
    const range = max - min || 1;
    return +(100 - ((v - min) / range) * 100).toFixed(1); // invert: lower is better
  }));
  return {
    ...baseTheme,
    legend: { ...baseTheme.legend, data: strategies.map(s => s.name) },
    tooltip: { ...baseTheme.tooltip },
    radar: {
      indicator: dims.map(d => ({ name: d.label, max: 100 })),
      shape: 'polygon', splitNumber: 4, center: ['50%', '55%'], radius: '65%',
      axisName: { color: '#8b95a8', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1a2340' } },
      splitArea: { areaStyle: { color: ['transparent'] } },
      axisLine: { lineStyle: { color: '#2a3450' } },
    },
    series: [{ type: 'radar', data: strategies.map((s, si) => ({
      name: s.name, value: normalized[si],
      lineStyle: { color: s.color, width: 2 }, itemStyle: { color: s.color },
      areaStyle: { color: s.color, opacity: 0.08 },
    })) }],
  };
}

function buildS1(results: SimulationResult[], strategies: Strategy[]): Record<string, unknown> {
  const scoreMap = calculateAllStrategyScores(results, strategies.map(s => s.id));
  const dimensions = ['经济性', '约束遵循', '合理性'];
  return {
    ...baseTheme,
    legend: { ...baseTheme.legend, data: strategies.map(s => s.name) },
    tooltip: { ...baseTheme.tooltip },
    radar: {
      indicator: dimensions.map(d => ({ name: d, max: 100 })),
      shape: 'polygon', splitNumber: 4, center: ['50%', '55%'], radius: '65%',
      axisName: { color: '#8b95a8', fontSize: 12 },
      splitLine: { lineStyle: { color: '#1a2340' } },
      splitArea: { areaStyle: { color: ['transparent'] } },
      axisLine: { lineStyle: { color: '#2a3450' } },
    },
    series: [{ type: 'radar', data: strategies.map(s => {
      const sc = scoreMap.get(s.id)!;
      return {
        name: s.name, value: [sc.economy, sc.constraint, sc.feasibility],
        lineStyle: { color: s.color, width: 2 }, itemStyle: { color: s.color },
        areaStyle: { color: s.color, opacity: 0.1 },
      };
    }) }],
  };
}

function buildS2(results: SimulationResult[], strategies: Strategy[]): Record<string, unknown> {
  const scoreMap = calculateAllStrategyScores(results, strategies.map(s => s.id));
  const scores = strategies.map(s => {
    const sc = scoreMap.get(s.id)!;
    return { name: s.name, score: sc.overall, color: s.color };
  }).sort((a, b) => b.score - a.score);
  return {
    ...baseTheme,
    grid: { ...baseTheme.grid, left: 120 },
    tooltip: { ...baseTheme.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', name: '综合评分', max: 100, ...axisStyle },
    yAxis: { type: 'category', data: scores.map(s => s.name), inverse: true, ...axisStyle },
    series: [{
      type: 'bar',
      data: scores.map(s => ({ value: s.score, itemStyle: { color: s.color, borderRadius: [0, 4, 4, 0] } })),
      barWidth: 24,
      label: { show: true, position: 'right', color: '#e8ecf4', fontSize: 12, fontWeight: 600 },
    }],
  };
}

// ─── Build all chart definitions ───

function buildChartDefs(
  results: SimulationResult[],
  strategies: Strategy[],
  batches: OrderBatch[],
  availability: DataAvailability,
): ChartDef[] {
  const hasMultiStrategies = strategies.length > 1;
  const hasMultiBatches = batches.length > 1;
  const allZero = hasZeroViolations(results);

  const charts: ChartDef[] = [];
  const addChart = (id: string, title: string, section: string, option: Record<string, unknown>, insight: string, height?: number) => {
    charts.push({ id, title, section, option, insight, height });
  };

  // Economic
  addChart('E1', 'E1 · 各批次车次数对比', 'economic', buildE1(results, strategies, batches), getInsight('E1', results, strategies, batches));
  addChart('E2', 'E2 · 各批次总里程对比', 'economic', buildE2(results, strategies, batches), getInsight('E2', results, strategies, batches));
  addChart('E3', 'E3 · 各批次总工作时长对比', 'economic', buildE3(results, strategies, batches), getInsight('E3', results, strategies, batches));
  addChart('E4', 'E4 · 各批次平均满载率对比', 'economic', buildE4(results, strategies, batches), getInsight('E4', results, strategies, batches));
  if (shouldRenderE5(availability)) addChart('E5', 'E5 · 分车型平均满载率', 'economic', buildE5(results, strategies), getInsight('E5', results, strategies, batches));
  if (shouldRenderE6(availability)) addChart('E6', 'E6 · 分车型使用次数', 'economic', buildE6(results, strategies), getInsight('E6', results, strategies, batches));
  if (shouldRenderE7(availability)) addChart('E7', 'E7 · 总成本对比', 'economic', buildE7(results, strategies), getInsight('E7', results, strategies, batches));
  if (shouldRenderE8(availability, hasMultiBatches)) addChart('E8', 'E8 · 里程节降率趋势', 'economic', buildE8(results, strategies, batches), getInsight('E8', results, strategies, batches));

  // Constraint
  if (!allZero) {
    addChart('C1', 'C1 · 约束违反率总览', 'constraint', buildC1(results, strategies), getInsight('C1', results, strategies, batches));
    if (shouldRenderC2(availability)) addChart('C2', 'C2 · 工作时长超限分布', 'constraint', buildBoxplot(results, strategies, 'durationOverLimit', '超限幅度(min)'), getInsight('C2', results, strategies, batches));
    if (shouldRenderC3(availability)) addChart('C3', 'C3 · 行驶里程超限分布', 'constraint', buildBoxplot(results, strategies, 'distanceOverLimit', '超限幅度(km)'), getInsight('C3', results, strategies, batches));
    if (shouldRenderC4(availability)) addChart('C4', 'C4 · 装载量超限热力图', 'constraint', buildC4(results, strategies, availability), getInsight('C4', results, strategies, batches), 300);
    addChart('C5', 'C5 · 约束违反车次明细', 'constraint', buildC5(results, strategies), getInsight('C5', results, strategies, batches), 360);
  }

  // Feasibility
  if (shouldRenderF1(availability)) addChart('F1', 'F1 · 路线跨度分布', 'feasibility', buildF1(results, strategies), getInsight('F1', results, strategies, batches));
  if (shouldRenderF2(availability)) addChart('F2', 'F2 · 跨区数量分布', 'feasibility', buildF2(results, strategies), getInsight('F2', results, strategies, batches));
  if (shouldRenderF3(availability)) addChart('F3', 'F3 · 绕行率分布', 'feasibility', buildF3(results, strategies), getInsight('F3', results, strategies, batches));
  addChart('F4', 'F4 · 卸货点数分布', 'feasibility', buildF4(results, strategies), getInsight('F4', results, strategies, batches));
  if (shouldRenderF5(availability)) addChart('F5', 'F5 · 聚类紧密度 (Top-K)', 'feasibility', buildF5(results, strategies), getInsight('F5', results, strategies, batches));
  if (shouldRenderF6(availability)) addChart('F6', 'F6 · 点间距累积分布 (CDF)', 'feasibility', buildF6(results, strategies), getInsight('F6', results, strategies, batches));
  if (shouldRenderF7(availability)) addChart('F7', 'F7 · 多维合理性雷达图', 'feasibility', buildF7(results, strategies, availability), getInsight('F7', results, strategies, batches), 380);

  // Summary
  addChart('S1', 'S1 · 策略综合评分雷达图', 'summary', buildS1(results, strategies), getInsight('S1', results, strategies, batches), 380);
  addChart('S2', 'S2 · 策略排名对比', 'summary', buildS2(results, strategies), getInsight('S2', results, strategies, batches));

  // Add special constraint card content for zero-violation case
  if (allZero && !hasMultiStrategies) {
    // Single strategy zero violation - still need summary section marker
  }

  return charts;
}

// ─── HTML template ───

function buildKpiHtml(results: SimulationResult[], strategies: Strategy[]): string {
  const manualResults = results.filter(r => r.strategyId === 's1');
  const fallbackResults = manualResults.length > 0 ? manualResults : results.filter(r => r.strategyId === strategies[0]?.id);
  const mVehicles = fallbackResults.reduce((s, r) => s + r.vehicleCount, 0);
  const mDist = fallbackResults.reduce((s, r) => s + r.totalDistance, 0);
  const mDur = fallbackResults.reduce((s, r) => s + r.totalDuration, 0);
  const mLoad = fallbackResults.reduce((s, r) => s + r.avgLoadRate, 0) / (fallbackResults.length || 1);

  const kpis = [
    { label: '总车次数', value: mVehicles, unit: '次' },
    { label: '总里程', value: mDist.toFixed(1), unit: 'km' },
    { label: '总工作时长', value: (mDur / 60).toFixed(1), unit: 'h' },
    { label: '平均满载率', value: mLoad.toFixed(1), unit: '%' },
  ];

  return kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}<span class="kpi-unit">${k.unit}</span></div>
    </div>
  `).join('');
}

function buildZeroViolationHtml(availability: DataAvailability, insightText: string): string {
  const constraints = [
    { label: '工作时长上限', available: availability.hasDurationLimit },
    { label: '行驶里程上限', available: availability.hasDistanceLimit },
    { label: '装载重量上限', available: availability.hasWeightLimit },
    { label: '装载体积上限', available: availability.hasVolumeLimit },
    { label: '装载件数上限', available: availability.hasQtyLimit },
    { label: '跨区数量上限', available: availability.hasCrossRegionLimit },
    { label: '卸货点数上限', available: availability.hasStopLimit },
  ].filter(c => c.available);

  return `
    <div class="chart-card" style="grid-column: 1 / -1;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
        <div style="width:48px;height:48px;border-radius:50%;background:rgba(52,211,153,0.1);display:flex;align-items:center;justify-content:center;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div>
          <h3 style="font-size:15px;color:#34d399;margin:0 0 4px 0;font-weight:600;">全部约束检查通过</h3>
          <p style="font-size:12px;color:#8b95a8;margin:0;">所有策略均完全遵循约束条件，无任何违反记录</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:16px;">
        ${constraints.map(c => `
          <div style="display:flex;align-items:center;gap:6px;background:rgba(52,211,153,0.05);border:1px solid rgba(52,211,153,0.1);border-radius:8px;padding:8px 12px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span style="font-size:12px;color:#8b95a8;">${c.label}</span>
          </div>
        `).join('')}
      </div>
      <div class="insight">${escapeHtml(insightText)}</div>
    </div>
  `;
}

export function generateHtml(
  report: PocReport,
  results: SimulationResult[],
  strategies: Strategy[],
  batches: OrderBatch[],
  availability: DataAvailability,
  _sections: NavSection[]
): void {
  const chartDefs = buildChartDefs(results, strategies, batches, availability);
  const kpiHtml = buildKpiHtml(results, strategies);
  const allZero = hasZeroViolations(results);

  // Group charts by section
  const sectionConfig = [
    { id: 'economic', label: '经济性指标', color: '#f59e0b' },
    { id: 'constraint', label: '约束遵循情况', color: '#ef4444' },
    { id: 'feasibility', label: '合理性指标', color: '#34d399' },
    { id: 'summary', label: '综合评估', color: '#a78bfa' },
  ];

  let chartsHtml = '';
  for (const sec of sectionConfig) {
    const sectionCharts = chartDefs.filter(c => c.section === sec.id);
    const showSection = sectionCharts.length > 0 || (sec.id === 'constraint' && allZero);
    if (!showSection) continue;

    chartsHtml += `<h2><span class="dot" style="background:${sec.color}"></span>${sec.label}</h2>\n<div class="chart-grid">\n`;

    if (sec.id === 'constraint' && allZero) {
      chartsHtml += buildZeroViolationHtml(availability, getInsight('C1', results, strategies, batches));
    }

    for (const chart of sectionCharts) {
      const h = chart.height || 320;
      chartsHtml += `
  <div class="chart-card">
    <h3>${escapeHtml(chart.title)}</h3>
    <div id="chart-${chart.id}" class="chart-container" style="height:${h}px;"></div>
    <div class="insight">${escapeHtml(chart.insight)}</div>
  </div>\n`;
    }

    chartsHtml += `</div>\n`;
  }

  // Serialize chart options (remove function-based symbolSize for scatter)
  const chartOptionsJson = JSON.stringify(
    chartDefs.map(c => {
      // Handle symbolSize functions - convert to fixed values
      const option = JSON.parse(JSON.stringify(c.option, (_key, value) => {
        if (typeof value === 'function') return undefined;
        return value;
      }));
      // For C5 scatter chart with dynamic symbolSize, set a fixed size
      if (c.id === 'C5' && option.series) {
        for (const s of option.series) {
          if (s.type === 'scatter' && !s.symbolSize) {
            s.symbolSize = 8;
          }
        }
      }
      return { id: c.id, option };
    })
  );

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(report.title)} - POC 对比报告</title>
<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"><\/script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0e1a; color: #e8ecf4; min-height: 100vh; padding: 24px; max-width: 1200px; margin: 0 auto; }
h1 { font-size: 20px; margin-bottom: 8px; }
h2 { font-size: 16px; margin: 32px 0 16px; display: flex; align-items: center; gap: 8px; }
h2 .dot { width: 6px; height: 20px; border-radius: 3px; }
.meta { font-size: 12px; color: #8b95a8; margin-bottom: 24px; }
.kpi-row { display: flex; gap: 12px; margin-bottom: 32px; flex-wrap: wrap; }
.kpi-card { background: rgba(15,22,41,0.7); border: 1px solid rgba(100,140,200,0.1); border-radius: 12px; padding: 16px; flex: 1; min-width: 160px; }
.kpi-label { font-size: 12px; color: #5a6478; margin-bottom: 8px; }
.kpi-value { font-size: 24px; font-weight: bold; }
.kpi-unit { font-size: 14px; font-weight: normal; color: #8b95a8; margin-left: 4px; }
.chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 16px; }
.chart-card { background: rgba(15,22,41,0.7); border: 1px solid rgba(100,140,200,0.1); border-radius: 12px; padding: 16px; }
.chart-card h3 { font-size: 13px; margin-bottom: 12px; }
.chart-container { height: 320px; }
.insight { margin-top: 12px; padding: 10px 12px; border-left: 3px solid #4a9eff; background: rgba(74,158,255,0.06); border-radius: 0 6px 6px 0; font-size: 12px; color: #8b95a8; line-height: 1.6; }
.legend { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #8b95a8; }
.legend-dot { width: 10px; height: 10px; border-radius: 2px; }
.footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid rgba(100,140,200,0.1); font-size: 11px; color: #5a6478; text-align: center; }
@media print { body { background: #fff; color: #333; } .chart-card { border-color: #ddd; background: #f9f9f9; } .insight { background: #f0f4ff; } }
</style>
</head>
<body>
<h1>${escapeHtml(report.title)}</h1>
<div class="meta">
  项目: C-ROS 智能调度系统 &nbsp;|&nbsp;
  批次: ${batches.map(b => escapeHtml(b.name)).join(', ')} &nbsp;|&nbsp;
  策略: ${strategies.map(s => escapeHtml(s.name)).join(', ')} &nbsp;|&nbsp;
  生成时间: ${escapeHtml(report.completedAt || new Date().toISOString().slice(0, 19).replace('T', ' '))}
</div>

<div class="legend">
  ${strategies.map(s => `<div class="legend-item"><div class="legend-dot" style="background:${s.color}"></div>${escapeHtml(s.name)}</div>`).join('')}
</div>

<div class="kpi-row">${kpiHtml}</div>

${chartsHtml}

<div class="footer">
  C-ROS 智能调度系统 · POC 对比报告 · 由系统自动生成
</div>

<script>
(function() {
  var CHARTS = ${chartOptionsJson};
  for (var i = 0; i < CHARTS.length; i++) {
    var item = CHARTS[i];
    var dom = document.getElementById('chart-' + item.id);
    if (!dom) continue;
    try {
      var chart = echarts.init(dom);
      chart.setOption(item.option);
      window.addEventListener('resize', (function(c) { return function() { c.resize(); }; })(chart));
    } catch(e) {
      console.warn('Chart ' + item.id + ' failed:', e);
    }
  }
})();
<\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `POC报告_${report.title}_${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
