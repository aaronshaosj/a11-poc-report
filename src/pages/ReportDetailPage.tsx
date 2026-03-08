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
import { mockDataAvailability } from '../data/mockAvailability';
import type { DataAvailability } from '../types';

// Economic charts (E1-E8)
import VehicleCountChart from '../components/charts/VehicleCountChart';
import TotalDistanceChart from '../components/charts/TotalDistanceChart';
import TotalDurationChart from '../components/charts/TotalDurationChart';
import LoadRateChart from '../components/charts/LoadRateChart';
import LoadRateByTypeChart from '../components/charts/LoadRateByTypeChart';
import VehicleCountByTypeChart from '../components/charts/VehicleCountByTypeChart';
import TotalCostChart from '../components/charts/TotalCostChart';
import SavingsTrendChart from '../components/charts/SavingsTrendChart';

// Constraint charts (C1-C5)
import ConstraintViolationChart from '../components/charts/ConstraintViolationChart';
import DurationOverLimitChart from '../components/charts/DurationOverLimitChart';
import DistanceOverLimitChart from '../components/charts/DistanceOverLimitChart';
import LoadOverLimitHeatmap from '../components/charts/LoadOverLimitHeatmap';
import ViolationScatterChart from '../components/charts/ViolationScatterChart';

// Feasibility charts (F1-F7)
import RouteSpanBoxChart from '../components/charts/RouteSpanBoxChart';
import CrossRegionChart from '../components/charts/CrossRegionChart';
import DetourRatioChart from '../components/charts/DetourRatioChart';
import StopCountBoxChart from '../components/charts/StopCountBoxChart';
import TopKScatterChart from '../components/charts/TopKScatterChart';
import IntervalCDFChart from '../components/charts/IntervalCDFChart';
import FeasibilityRadarChart from '../components/charts/FeasibilityRadarChart';

// Summary charts (S1-S2)
import StrategyRadarChart from '../components/charts/StrategyRadarChart';
import StrategyRankChart from '../components/charts/StrategyRankChart';

// shouldRender helpers
function shouldRenderE5(a: DataAvailability) { return a.hasMultiVehicleTypes; }
function shouldRenderE6(a: DataAvailability) { return a.hasMultiVehicleTypes; }
function shouldRenderE7(a: DataAvailability) { return a.hasCostStructure; }
function shouldRenderE8(a: DataAvailability) { return a.hasMultiBatches; }
function shouldRenderC2(a: DataAvailability) { return a.hasDurationLimit; }
function shouldRenderC3(a: DataAvailability) { return a.hasDistanceLimit; }
function shouldRenderC4(a: DataAvailability) { return a.hasWeightLimit || a.hasVolumeLimit || a.hasQtyLimit; }
function shouldRenderF1(a: DataAvailability) { return a.hasRouteSpan; }
function shouldRenderF2(a: DataAvailability) { return a.hasCrossRegion; }
function shouldRenderF3(a: DataAvailability) { return a.hasDetourRatio; }
function shouldRenderF5(a: DataAvailability) { return a.hasTopK; }
function shouldRenderF6(a: DataAvailability) { return a.hasStopInterval; }
function shouldRenderF7(a: DataAvailability) {
  const dims = [a.hasRouteSpan, a.hasCrossRegion, a.hasDetourRatio, a.hasTopK, a.hasStopInterval].filter(Boolean).length;
  return dims >= 3;
}

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
  const availability = mockDataAvailability;

  // KPI calculations
  const manualResults = results.filter(r => r.strategyId === 's1');
  const manualTotalVehicles = manualResults.reduce((s, r) => s + r.vehicleCount, 0);
  const manualTotalDist = manualResults.reduce((s, r) => s + r.totalDistance, 0);
  const manualTotalDur = manualResults.reduce((s, r) => s + r.totalDuration, 0);
  const manualAvgLoad = manualResults.reduce((s, r) => s + r.avgLoadRate, 0) / (manualResults.length || 1);

  const chartProps = { results, strategyIds: report.strategyIds, batchIds: report.batchIds };
  const chartPropsNoB = { results, strategyIds: report.strategyIds };

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

        {/* Economic Charts */}
        <section id="economic" className="mb-10">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-accent-orange" />
              经济性指标
            </h2>
            <p className="text-xs text-text-muted mt-1 ml-3.5">衡量调度方案的成本效益表现</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="E1 · 各批次车次数对比" insight={mockInsights.E1}>
              <VehicleCountChart {...chartProps} />
            </ChartCard>
            <ChartCard title="E2 · 各批次总里程对比" insight={mockInsights.E2}>
              <TotalDistanceChart {...chartProps} />
            </ChartCard>
            <ChartCard title="E3 · 各批次总工作时长对比" insight={mockInsights.E3}>
              <TotalDurationChart {...chartProps} />
            </ChartCard>
            <ChartCard title="E4 · 各批次平均满载率对比" insight={mockInsights.E4}>
              <LoadRateChart {...chartProps} />
            </ChartCard>
            {shouldRenderE5(availability) && (
              <ChartCard title="E5 · 分车型平均满载率" insight={mockInsights.E5}>
                <LoadRateByTypeChart {...chartPropsNoB} />
              </ChartCard>
            )}
            {shouldRenderE6(availability) && (
              <ChartCard title="E6 · 分车型使用次数" insight={mockInsights.E6}>
                <VehicleCountByTypeChart {...chartPropsNoB} />
              </ChartCard>
            )}
            {shouldRenderE7(availability) && (
              <ChartCard title="E7 · 总成本对比" insight={mockInsights.E7}>
                <TotalCostChart {...chartPropsNoB} />
              </ChartCard>
            )}
            {shouldRenderE8(availability) && (
              <ChartCard title="E8 · 里程节降率趋势" insight={mockInsights.E8}>
                <SavingsTrendChart {...chartProps} />
              </ChartCard>
            )}
          </div>
        </section>

        {/* Constraint Compliance Charts */}
        <section id="constraint" className="mb-10">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-[#ef4444]" />
              约束遵循情况
            </h2>
            <p className="text-xs text-text-muted mt-1 ml-3.5">分析各策略对运营规则的遵循程度</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="C1 · 约束违反率总览" insight={mockInsights.C1}>
              <ConstraintViolationChart {...chartPropsNoB} />
            </ChartCard>
            {shouldRenderC2(availability) && (
              <ChartCard title="C2 · 工作时长超限分布" insight={mockInsights.C2}>
                <DurationOverLimitChart {...chartPropsNoB} />
              </ChartCard>
            )}
            {shouldRenderC3(availability) && (
              <ChartCard title="C3 · 行驶里程超限分布" insight={mockInsights.C3}>
                <DistanceOverLimitChart {...chartPropsNoB} />
              </ChartCard>
            )}
            {shouldRenderC4(availability) && (
              <ChartCard title="C4 · 装载量超限热力图" insight={mockInsights.C4} height={300}>
                <LoadOverLimitHeatmap results={results} strategyIds={report.strategyIds} availability={availability} />
              </ChartCard>
            )}
            <ChartCard title="C5 · 约束违反车次明细" insight={mockInsights.C5} height={360}>
              <ViolationScatterChart {...chartPropsNoB} />
            </ChartCard>
          </div>
        </section>

        {/* Feasibility Charts */}
        <section id="feasibility" className="mb-10">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-accent-green" />
              合理性指标
            </h2>
            <p className="text-xs text-text-muted mt-1 ml-3.5">评估路线方案的落地可行性</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shouldRenderF1(availability) && (
              <ChartCard title="F1 · 路线跨度分布" insight={mockInsights.F1}>
                <RouteSpanBoxChart {...chartPropsNoB} />
              </ChartCard>
            )}
            {shouldRenderF2(availability) && (
              <ChartCard title="F2 · 跨区数量分布" insight={mockInsights.F2}>
                <CrossRegionChart {...chartPropsNoB} />
              </ChartCard>
            )}
            {shouldRenderF3(availability) && (
              <ChartCard title="F3 · 绕行率分布" insight={mockInsights.F3}>
                <DetourRatioChart {...chartPropsNoB} />
              </ChartCard>
            )}
            <ChartCard title="F4 · 卸货点数分布" insight={mockInsights.F4}>
              <StopCountBoxChart {...chartPropsNoB} />
            </ChartCard>
            {shouldRenderF5(availability) && (
              <ChartCard title="F5 · 聚类紧密度 (Top-K)" insight={mockInsights.F5}>
                <TopKScatterChart {...chartPropsNoB} />
              </ChartCard>
            )}
            {shouldRenderF6(availability) && (
              <ChartCard title="F6 · 点间距累积分布 (CDF)" insight={mockInsights.F6}>
                <IntervalCDFChart {...chartPropsNoB} />
              </ChartCard>
            )}
            {shouldRenderF7(availability) && (
              <ChartCard title="F7 · 多维合理性雷达图" insight={mockInsights.F7} height={380}>
                <FeasibilityRadarChart results={results} strategyIds={report.strategyIds} availability={availability} />
              </ChartCard>
            )}
          </div>
        </section>

        {/* Summary Charts */}
        <section id="summary" className="mb-10">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-accent-purple" />
              综合评估
            </h2>
            <p className="text-xs text-text-muted mt-1 ml-3.5">跨维度的策略综合评分与排名</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="S1 · 策略综合评分雷达图" insight={mockInsights.S1} height={380}>
              <StrategyRadarChart {...chartPropsNoB} />
            </ChartCard>
            <ChartCard title="S2 · 策略排名对比" insight={mockInsights.S2}>
              <StrategyRankChart {...chartPropsNoB} />
            </ChartCard>
          </div>
        </section>
      </main>
    </div>
  );
}
