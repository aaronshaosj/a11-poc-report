import * as XLSX from 'xlsx';
import type { PocReport, SimulationResult, Strategy, OrderBatch, DataAvailability } from '../types';

function generateOverviewSheet(report: PocReport, strategies: Strategy[], batches: OrderBatch[]): XLSX.WorkSheet {
  const data: (string | number)[][] = [
    ['项目信息'],
    ['报告标题', report.title],
    ['生成时间', report.completedAt || ''],
    ['耗时(秒)', report.duration || 0],
    [],
    ['订单批次'],
    ['批次ID', '批次名称', '订单数', '站点数', '总重量(kg)', '总体积(m³)', '日期'],
    ...batches.map(b => [b.id, b.name, b.orderCount, b.stopCount, b.totalWeight, b.totalVolume, b.date]),
    [],
    ['对比策略'],
    ['策略ID', '策略名称', '类型', '迭代轮次', '节降率(%)'],
    ...strategies.map(s => [s.id, s.name, s.type === 'manual' ? '人工' : '算法', s.iterations || '-', s.savingsRate || '-']),
  ];
  return XLSX.utils.aoa_to_sheet(data);
}

function generateEconomicSheet(results: SimulationResult[], strategies: Strategy[], batches: OrderBatch[]): XLSX.WorkSheet {
  const header = ['批次', '指标', ...strategies.map(s => s.name)];
  const rows: (string | number)[][] = [header];

  for (const b of batches) {
    const metrics = [
      { label: '车次数', fn: (r: SimulationResult) => r.vehicleCount },
      { label: '总里程(km)', fn: (r: SimulationResult) => r.totalDistance },
      { label: '总时长(min)', fn: (r: SimulationResult) => r.totalDuration },
      { label: '平均满载率(%)', fn: (r: SimulationResult) => r.avgLoadRate },
    ];
    for (const m of metrics) {
      const row: (string | number)[] = [b.name, m.label];
      for (const s of strategies) {
        const r = results.find(r => r.batchId === b.id && r.strategyId === s.id);
        row.push(r ? m.fn(r) : '');
      }
      rows.push(row);
    }
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function generateVehicleTypeSheet(results: SimulationResult[], strategies: Strategy[]): XLSX.WorkSheet {
  const types = new Set<string>();
  results.forEach(r => Object.keys(r.vehicleCountByType || {}).forEach(t => types.add(t)));
  const typeArr = Array.from(types).sort();

  const header = ['车型', '指标', ...strategies.map(s => s.name)];
  const rows: (string | number)[][] = [header];

  for (const t of typeArr) {
    // Usage count
    const countRow: (string | number)[] = [t, '使用次数'];
    for (const s of strategies) {
      const total = results.filter(r => r.strategyId === s.id).reduce((sum, r) => sum + (r.vehicleCountByType?.[t] || 0), 0);
      countRow.push(total);
    }
    rows.push(countRow);
    // Avg load rate
    const rateRow: (string | number)[] = [t, '平均满载率(%)'];
    for (const s of strategies) {
      const rs = results.filter(r => r.strategyId === s.id);
      const rates = rs.map(r => r.avgLoadRateByType?.[t]).filter((v): v is number => v != null);
      rateRow.push(rates.length > 0 ? +(rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1) : '');
    }
    rows.push(rateRow);
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function generateConstraintSheet(results: SimulationResult[], strategies: Strategy[]): XLSX.WorkSheet {
  const header = ['策略', '约束类型', '违反车次', '总车次', '违反率(%)', '最大超限', '平均超限'];
  const rows: (string | number)[][] = [header];

  for (const s of strategies) {
    const rs = results.filter(r => r.strategyId === s.id);
    const violations = rs.flatMap(r => r.constraintViolations);
    // Aggregate by type
    const byType: Record<string, { violated: number; total: number; maxOver: number; sumOver: number; count: number }> = {};
    for (const v of violations) {
      if (!byType[v.type]) byType[v.type] = { violated: 0, total: 0, maxOver: 0, sumOver: 0, count: 0 };
      byType[v.type].violated += v.violatedCount;
      byType[v.type].total += v.totalCount;
      byType[v.type].maxOver = Math.max(byType[v.type].maxOver, v.maxOverage);
      byType[v.type].sumOver += v.avgOverage * v.violatedCount;
      byType[v.type].count += v.violatedCount;
    }
    for (const [type, data] of Object.entries(byType)) {
      rows.push([
        s.name, type, data.violated, data.total,
        +(data.total > 0 ? data.violated / data.total * 100 : 0).toFixed(1),
        +data.maxOver.toFixed(1),
        +(data.count > 0 ? data.sumOver / data.count : 0).toFixed(1),
      ]);
    }
    if (Object.keys(byType).length === 0) {
      rows.push([s.name, '(无违反)', 0, rs.reduce((s, r) => s + r.vehicleCount, 0), 0, 0, 0]);
    }
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function generateFeasibilitySheet(results: SimulationResult[], strategies: Strategy[]): XLSX.WorkSheet {
  const header = ['策略', '路线跨度中位(km)', '跨区均值', '绕行率均值(%)', '卸货点中位', 'TopK均值(km)', '点间距均值(km)'];
  const rows: (string | number)[][] = [header];

  for (const s of strategies) {
    const details = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails);
    const sorted = (vals: number[]) => { vals.sort((a, b) => a - b); return vals; };
    const median = (vals: number[]) => { const s = sorted(vals); return s[Math.floor(s.length / 2)] || 0; };
    const avg = (vals: number[]) => vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

    rows.push([
      s.name,
      +median(details.map(d => d.routeSpan)).toFixed(1),
      +avg(details.map(d => d.crossRegionCount)).toFixed(2),
      +avg(details.map(d => d.detourRatio || 0)).toFixed(1),
      median(details.map(d => d.stopCount)),
      +avg(details.map(d => d.topKAvg)).toFixed(2),
      +avg(details.map(d => d.maxStopInterval)).toFixed(1),
    ]);
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function generateScoreSheet(results: SimulationResult[], strategies: Strategy[]): XLSX.WorkSheet {
  const header = ['策略', '经济性得分', '约束遵循得分', '合理性得分', '综合得分', '排名'];
  const rows: (string | number)[][] = [header];

  const scores = strategies.map(s => {
    const rs = results.filter(r => r.strategyId === s.id);
    // Simplified scoring based on relative performance
    const totalDist = rs.reduce((sum, r) => sum + r.totalDistance, 0);
    const avgLoad = rs.reduce((sum, r) => sum + r.avgLoadRate, 0) / (rs.length || 1);
    const violations = rs.reduce((sum, r) => sum + r.constraintViolations.reduce((a, v) => a + v.violatedCount, 0), 0);
    const totalVehicles = rs.reduce((sum, r) => sum + r.vehicleCount, 0);
    const violationRate = totalVehicles > 0 ? violations / totalVehicles : 0;

    const econScore = Math.min(100, Math.max(0, 60 + (95 - totalDist / (rs.length || 1) / 10)));
    const constScore = Math.min(100, Math.max(0, 100 - violationRate * 500));
    const feasScore = Math.min(100, Math.max(0, avgLoad));
    const total = econScore * 0.4 + constScore * 0.3 + feasScore * 0.3;

    return { name: s.name, econScore: +econScore.toFixed(1), constScore: +constScore.toFixed(1), feasScore: +feasScore.toFixed(1), total: +total.toFixed(1) };
  });

  scores.sort((a, b) => b.total - a.total);
  scores.forEach((s, i) => {
    rows.push([s.name, s.econScore, s.constScore, s.feasScore, s.total, i + 1]);
  });
  return XLSX.utils.aoa_to_sheet(rows);
}

export function generateExcel(
  report: PocReport,
  results: SimulationResult[],
  strategies: Strategy[],
  batches: OrderBatch[],
  _availability: DataAvailability
): void {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, generateOverviewSheet(report, strategies, batches), '概览');
  XLSX.utils.book_append_sheet(wb, generateEconomicSheet(results, strategies, batches), '经济性对比');
  XLSX.utils.book_append_sheet(wb, generateVehicleTypeSheet(results, strategies), '分车型明细');
  XLSX.utils.book_append_sheet(wb, generateConstraintSheet(results, strategies), '约束遵循');
  XLSX.utils.book_append_sheet(wb, generateFeasibilitySheet(results, strategies), '合理性指标');
  XLSX.utils.book_append_sheet(wb, generateScoreSheet(results, strategies), '综合评分');

  XLSX.writeFile(wb, `POC报告_${report.title}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
