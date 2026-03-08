import { useParams, useLocation } from 'wouter';
import Navbar from '../components/layout/Navbar';
import FloatingNav from '../components/layout/FloatingNav';
import StrategyLegend from '../components/report/StrategyLegend';
import KpiCard from '../components/report/KpiCard';
import ChartCard from '../components/report/ChartCard';
import { mockReports } from '../data/mockReports';
import { mockStrategies } from '../data/mockStrategies';
import { mockBatches } from '../data/mockBatches';
import { getSimulationResults } from '../data/mockSimulation';
import { mockInsights } from '../data/mockInsights';

// Chart components
import VehicleCountChart from '../components/charts/VehicleCountChart';
import LoadRateChart from '../components/charts/LoadRateChart';
import MaxDistanceBoxChart from '../components/charts/MaxDistanceBoxChart';
import MaxDurationBoxChart from '../components/charts/MaxDurationBoxChart';
import StopIntervalChart from '../components/charts/StopIntervalChart';
import LoadUtilRadarChart from '../components/charts/LoadUtilRadarChart';
import OrderCountBoxChart from '../components/charts/OrderCountBoxChart';
import DistanceDensityChart from '../components/charts/DistanceDensityChart';
import RouteSpanHistChart from '../components/charts/RouteSpanHistChart';
import IntervalCDFChart from '../components/charts/IntervalCDFChart';
import CrossRegionChart from '../components/charts/CrossRegionChart';
import TopKScatterChart from '../components/charts/TopKScatterChart';
import RadarOverallChart from '../components/charts/RadarOverallChart';
import SavingsTrendChart from '../components/charts/SavingsTrendChart';
import DistDurationScatter from '../components/charts/DistDurationScatter';
import ScoreRankChart from '../components/charts/ScoreRankChart';

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const report = mockReports.find(r => r.id === params.id);

  if (!report || report.status !== 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-text-primary mb-2">报告不存在或尚未完成</div>
          <button onClick={() => navigate('/')} className="text-sm text-accent-blue hover:underline">
            返回列表
          </button>
        </div>
      </div>
    );
  }

  const results = getSimulationResults(report.id);
  const strategies = mockStrategies.filter(s => report.strategyIds.includes(s.id));
  const batches = mockBatches.filter(b => report.batchIds.includes(b.id));
  const algoStrategies = strategies.filter(s => s.type === 'algorithm');

  // KPI calculations
  const manualResults = results.filter(r => r.strategyId === 's1');
  const manualTotalVehicles = manualResults.reduce((s, r) => s + r.vehicleCount, 0);
  const manualTotalDist = manualResults.reduce((s, r) => s + r.totalDistance, 0);
  const manualTotalDur = manualResults.reduce((s, r) => s + r.totalDuration, 0);
  const manualAvgLoad = manualResults.reduce((s, r) => s + r.avgLoadRate, 0) / (manualResults.length || 1);

  const chartProps = { results, strategyIds: report.strategyIds, batchIds: report.batchIds };

  return (
    <div className="min-h-screen">
      <Navbar
        breadcrumb={[
          { label: 'POC 报告', href: '/' },
          { label: report.title },
        ]}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/')}
              className="text-xs px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            >
              ← 返回列表
            </button>
            <button className="text-xs px-3 py-1.5 rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors">
              下载 HTML
            </button>
            <button className="text-xs px-3 py-1.5 rounded-lg bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-colors">
              下载 Excel
            </button>
          </div>
        }
      />

      <FloatingNav />

      <main className="max-w-6xl mx-auto px-6 pt-20 pb-16 xl:pr-44">
        {/* Report Meta */}
        <div className="glass-card px-5 py-4 mb-4 animate-fade-up">
          <h1 className="text-lg font-bold text-text-primary mb-2">{report.title}</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-secondary">
            <span>项目: C-ROS 智能调度系统</span>
            <span>批次: {batches.map(b => b.name).join(', ')}</span>
            <span>总订单: {batches.reduce((s, b) => s + b.orderCount, 0)}</span>
            <span>总站点: {batches.reduce((s, b) => s + b.stopCount, 0)}</span>
            <span>生成时间: {report.completedAt}</span>
          </div>
        </div>

        {/* Strategy Legend */}
        <div className="mb-6 animate-fade-up" style={{ animationDelay: '0.05s' }}>
          <StrategyLegend strategies={strategies} />
        </div>

        {/* KPI Overview */}
        <section id="kpi" className="mb-8">
          <h2 className="text-base font-semibold text-text-primary mb-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            核心 KPI 概览
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            <KpiCard
              label="总车次数"
              baseValue={manualTotalVehicles}
              unit="次"
              deltas={algoStrategies.map(s => {
                const total = results.filter(r => r.strategyId === s.id).reduce((sum, r) => sum + r.vehicleCount, 0);
                return { strategy: s, value: total - manualTotalVehicles };
              })}
            />
            <KpiCard
              label="总里程"
              baseValue={+manualTotalDist.toFixed(1)}
              unit="km"
              deltas={algoStrategies.map(s => {
                const total = results.filter(r => r.strategyId === s.id).reduce((sum, r) => sum + r.totalDistance, 0);
                return { strategy: s, value: +((total - manualTotalDist) / manualTotalDist * 100).toFixed(1), isPercent: true };
              })}
            />
            <KpiCard
              label="总工作时长"
              baseValue={+(manualTotalDur / 60).toFixed(1)}
              unit="h"
              deltas={algoStrategies.map(s => {
                const total = results.filter(r => r.strategyId === s.id).reduce((sum, r) => sum + r.totalDuration, 0);
                return { strategy: s, value: +((total - manualTotalDur) / manualTotalDur * 100).toFixed(1), isPercent: true };
              })}
            />
            <KpiCard
              label="平均满载率"
              baseValue={+manualAvgLoad.toFixed(1)}
              unit="%"
              higherIsBetter
              deltas={algoStrategies.map(s => {
                const sResults = results.filter(r => r.strategyId === s.id);
                const avg = sResults.reduce((sum, r) => sum + r.avgLoadRate, 0) / (sResults.length || 1);
                return { strategy: s, value: +(avg - manualAvgLoad).toFixed(1), isPercent: true };
              })}
            />
            <KpiCard
              label="里程节降率"
              baseValue={0}
              unit="%"
              higherIsBetter
              deltas={algoStrategies.map(s => {
                const total = results.filter(r => r.strategyId === s.id).reduce((sum, r) => sum + r.totalDistance, 0);
                return { strategy: s, value: +((manualTotalDist - total) / manualTotalDist * 100).toFixed(1), isPercent: true };
              })}
            />
          </div>
        </section>

        {/* Type A Charts */}
        <section id="type-a" className="mb-10">
          <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-accent-blue" />
            Type A · 边界类指标
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="A1 · 各批次车次数对比" insight={mockInsights.A1}>
              <VehicleCountChart {...chartProps} />
            </ChartCard>
            <ChartCard title="A2 · 各批次平均满载率对比" insight={mockInsights.A2}>
              <LoadRateChart {...chartProps} />
            </ChartCard>
            <ChartCard title="A3 · 单车最大里程分布" insight={mockInsights.A3}>
              <MaxDistanceBoxChart results={results} strategyIds={report.strategyIds} />
            </ChartCard>
            <ChartCard title="A4 · 单车最大作业时长" insight={mockInsights.A4}>
              <MaxDurationBoxChart results={results} strategyIds={report.strategyIds} />
            </ChartCard>
            <ChartCard title="A5 · 最大站点间隔对比" insight={mockInsights.A5}>
              <StopIntervalChart {...chartProps} />
            </ChartCard>
            <ChartCard title="A6 · 装载量上限利用率" insight={mockInsights.A6} height={380}>
              <LoadUtilRadarChart results={results} strategyIds={report.strategyIds} />
            </ChartCard>
          </div>
        </section>

        {/* Type B Charts */}
        <section id="type-b" className="mb-10">
          <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-accent-green" />
            Type B · 形态类指标
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="B1 · 车次订单数分布" insight={mockInsights.B1}>
              <OrderCountBoxChart results={results} strategyIds={report.strategyIds} />
            </ChartCard>
            <ChartCard title="B2 · 车次行驶距离分布 (KDE)" insight={mockInsights.B2}>
              <DistanceDensityChart results={results} strategyIds={report.strategyIds} />
            </ChartCard>
            <ChartCard title="B3 · 线路跨度分布" insight={mockInsights.B3}>
              <RouteSpanHistChart results={results} strategyIds={report.strategyIds} />
            </ChartCard>
            <ChartCard title="B4 · 点间距分布 (CDF)" insight={mockInsights.B4}>
              <IntervalCDFChart results={results} strategyIds={report.strategyIds} />
            </ChartCard>
            <ChartCard title="B5 · 跨区数量分布" insight={mockInsights.B5}>
              <CrossRegionChart results={results} strategyIds={report.strategyIds} />
            </ChartCard>
            <ChartCard title="B6 · 聚类离散度 (Top-K)" insight={mockInsights.B6}>
              <TopKScatterChart results={results} strategyIds={report.strategyIds} />
            </ChartCard>
          </div>
        </section>

        {/* Type C Charts */}
        <section id="type-c" className="mb-10">
          <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-accent-purple" />
            Type C · 综合效能
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="C1 · 多维效能雷达图" insight={mockInsights.C1} height={380}>
              <RadarOverallChart results={results} strategyIds={report.strategyIds} />
            </ChartCard>
            <ChartCard title="C2 · 批次维度节降率趋势" insight={mockInsights.C2}>
              <SavingsTrendChart {...chartProps} />
            </ChartCard>
            <ChartCard title="C3 · 工作时长 vs 行驶距离" insight={mockInsights.C3}>
              <DistDurationScatter results={results} strategyIds={report.strategyIds} />
            </ChartCard>
            <ChartCard title="C4 · 综合评分排行" insight={mockInsights.C4}>
              <ScoreRankChart results={results} strategyIds={report.strategyIds} />
            </ChartCard>
          </div>
        </section>
      </main>
    </div>
  );
}
