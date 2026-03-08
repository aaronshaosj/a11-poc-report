import type { PocReport, SimulationResult, Strategy, OrderBatch, DataAvailability } from '../types';
import { getInsight } from './insightGenerator';

interface NavSection {
  id: string;
  label: string;
  count?: number;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildKpiHtml(results: SimulationResult[], _strategies: Strategy[], _batches: OrderBatch[]): string {
  const manualResults = results.filter(r => r.strategyId === 's1');
  const mVehicles = manualResults.reduce((s, r) => s + r.vehicleCount, 0);
  const mDist = manualResults.reduce((s, r) => s + r.totalDistance, 0);
  const mDur = manualResults.reduce((s, r) => s + r.totalDuration, 0);
  const mLoad = manualResults.reduce((s, r) => s + r.avgLoadRate, 0) / (manualResults.length || 1);

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

function buildChartDataJson(results: SimulationResult[], strategies: Strategy[], batches: OrderBatch[]): string {
  // Build chart data summaries for the HTML
  const chartData = {
    strategies: strategies.map(s => ({ name: s.name, color: s.color, type: s.type })),
    batches: batches.map(b => ({ name: b.name, orderCount: b.orderCount })),
    vehicleCount: batches.map(b => ({
      batch: b.name,
      values: strategies.map(s => {
        const r = results.find(r => r.batchId === b.id && r.strategyId === s.id);
        return r?.vehicleCount || 0;
      })
    })),
    totalDistance: batches.map(b => ({
      batch: b.name,
      values: strategies.map(s => {
        const r = results.find(r => r.batchId === b.id && r.strategyId === s.id);
        return r?.totalDistance || 0;
      })
    })),
    avgLoadRate: batches.map(b => ({
      batch: b.name,
      values: strategies.map(s => {
        const r = results.find(r => r.batchId === b.id && r.strategyId === s.id);
        return r?.avgLoadRate || 0;
      })
    })),
  };
  return JSON.stringify(chartData);
}

export function generateHtml(
  report: PocReport,
  results: SimulationResult[],
  strategies: Strategy[],
  batches: OrderBatch[],
  _availability: DataAvailability,
  _sections: NavSection[]
): void {
  const chartData = buildChartDataJson(results, strategies, batches);
  const kpiHtml = buildKpiHtml(results, strategies, batches);

  // Insights
  const insightE1 = escapeHtml(getInsight('E1', results, strategies, batches));
  const insightE2 = escapeHtml(getInsight('E2', results, strategies, batches));
  const insightE4 = escapeHtml(getInsight('E4', results, strategies, batches));
  const insightS2 = escapeHtml(getInsight('S2', results, strategies, batches));

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(report.title)} - POC 对比报告</title>
<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"><\/script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0e1a; color: #e8ecf4; min-height: 100vh; padding: 24px; }
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
</style>
</head>
<body>
<h1>${escapeHtml(report.title)}</h1>
<div class="meta">
  项目: C-ROS 智能调度系统 &nbsp;|&nbsp;
  批次: ${batches.map(b => escapeHtml(b.name)).join(', ')} &nbsp;|&nbsp;
  生成时间: ${escapeHtml(report.completedAt || '')}
</div>

<div class="legend">
  ${strategies.map(s => `<div class="legend-item"><div class="legend-dot" style="background:${s.color}"></div>${escapeHtml(s.name)}</div>`).join('')}
</div>

<div class="kpi-row">${kpiHtml}</div>

<h2><span class="dot" style="background:#f59e0b"></span>经济性指标</h2>
<div class="chart-grid">
  <div class="chart-card"><h3>E1 · 各批次车次数对比</h3><div id="chart-e1" class="chart-container"></div><div class="insight">${insightE1}</div></div>
  <div class="chart-card"><h3>E2 · 各批次总里程对比</h3><div id="chart-e2" class="chart-container"></div><div class="insight">${insightE2}</div></div>
  <div class="chart-card"><h3>E4 · 各批次平均满载率对比</h3><div id="chart-e4" class="chart-container"></div><div class="insight">${insightE4}</div></div>
</div>

<h2><span class="dot" style="background:#a78bfa"></span>综合评估</h2>
<div class="chart-grid">
  <div class="chart-card"><h3>S2 · 策略排名对比</h3><div class="insight">${insightS2}</div></div>
</div>

<script>
var DATA = ${chartData};
var darkTheme = { backgroundColor: 'transparent', textStyle: { color: '#8b95a8' }, legend: { textStyle: { color: '#8b95a8' } }, grid: { top: 40, right: 20, bottom: 30, left: 50 } };

function makeBar(domId, title, dataKey) {
  var d = DATA[dataKey]; if (!d) return;
  var chart = echarts.init(document.getElementById(domId));
  chart.setOption(Object.assign({}, darkTheme, {
    tooltip: { trigger: 'axis' },
    legend: { data: DATA.strategies.map(function(s){return s.name}), top: 0, textStyle: { color: '#8b95a8', fontSize: 11 } },
    xAxis: { type: 'category', data: d.map(function(x){return x.batch}), axisLabel: { color: '#5a6478', fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { color: '#5a6478', fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(100,140,200,0.08)' } } },
    series: DATA.strategies.map(function(s, i){ return { name: s.name, type: 'bar', barGap: '15%', data: d.map(function(x){return x.values[i]}), itemStyle: { color: s.color } }; })
  }));
  window.addEventListener('resize', function(){ chart.resize(); });
}

function makeLine(domId, dataKey) {
  var d = DATA[dataKey]; if (!d) return;
  var chart = echarts.init(document.getElementById(domId));
  chart.setOption(Object.assign({}, darkTheme, {
    tooltip: { trigger: 'axis' },
    legend: { data: DATA.strategies.map(function(s){return s.name}), top: 0, textStyle: { color: '#8b95a8', fontSize: 11 } },
    xAxis: { type: 'category', data: d.map(function(x){return x.batch}), axisLabel: { color: '#5a6478', fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { color: '#5a6478', fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(100,140,200,0.08)' } } },
    series: DATA.strategies.map(function(s, i){ return { name: s.name, type: 'line', smooth: true, data: d.map(function(x){return x.values[i]}), itemStyle: { color: s.color }, lineStyle: { width: 2, type: s.type === 'manual' ? 'dashed' : 'solid' } }; })
  }));
  window.addEventListener('resize', function(){ chart.resize(); });
}

makeBar('chart-e1', 'E1', 'vehicleCount');
makeBar('chart-e2', 'E2', 'totalDistance');
makeLine('chart-e4', 'avgLoadRate');
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
