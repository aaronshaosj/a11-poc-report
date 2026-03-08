import { useLocation } from 'wouter';
import type { PocReport } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { mockBatches } from '../../data/mockBatches';
import { getSimulationResults } from '../../data/mockSimulation';
import { getDataAvailability } from '../../data/mockAvailability';
import { STATUS_COLORS, STATUS_LABELS } from '../../lib/colors';
import { cn } from '../../lib/utils';

interface ReportCardProps {
  report: PocReport;
}

export default function ReportCard({ report }: ReportCardProps) {
  const [, navigate] = useLocation();
  const strategies = mockStrategies.filter(s => report.strategyIds.includes(s.id));
  const batches = mockBatches.filter(b => report.batchIds.includes(b.id));
  const statusColor = STATUS_COLORS[report.status];
  const statusLabel = STATUS_LABELS[report.status];
  const isClickable = report.status === 'completed';

  const handleClick = () => {
    if (isClickable) navigate(`/report/${report.id}`);
  };

  return (
    <div
      className={cn(
        'glass-card p-5 animate-fade-up',
        isClickable && 'cursor-pointer'
      )}
      data-status={report.status}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">{report.title}</h3>
          <div className="text-xs text-text-muted mt-1">
            {report.createdAt}
            {report.duration && ` · 耗时 ${Math.floor(report.duration / 60)} 分 ${report.duration % 60} 秒`}
          </div>
        </div>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: statusColor + '20',
            color: statusColor,
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="text-xs text-text-secondary mb-3">
        <span className="text-text-muted">订单批次: </span>
        {batches.map(b => b.name).join(', ')}
        <span className="mx-2 text-text-muted">|</span>
        <span className="text-text-muted">对比策略: </span>
        {strategies.length} 组
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {strategies.map(s => (
          <span
            key={s.id}
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: s.color + '30',
              color: s.color,
            }}
          >
            {s.name}
          </span>
        ))}
      </div>

      {report.status === 'completed' && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">
            包含 {report.chartCount} 张交互式图表 · {report.kpiCount} 项 KPI 概览
          </span>
          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => {
                const results = getSimulationResults(report.id);
                const availability = getDataAvailability(report.id);
                import('../../lib/htmlExport').then(m => m.generateHtml(report, results, strategies, batches, availability, []));
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors"
            >
              下载 HTML
            </button>
            <button
              onClick={() => {
                const results = getSimulationResults(report.id);
                const availability = getDataAvailability(report.id);
                import('../../lib/excelExport').then(m => m.generateExcel(report, results, strategies, batches, availability));
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-colors"
            >
              下载 Excel
            </button>
          </div>
        </div>
      )}

      {report.status === 'generating' && (
        <div className="space-y-2">
          <div className="w-full h-1.5 rounded-full bg-[rgba(15,22,41,0.5)] overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-blue transition-all"
              style={{ width: `${report.progress || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-accent-blue">{report.progress}%</span>
            <span className="text-text-muted">预计剩余 {report.estimatedRemaining}</span>
          </div>
        </div>
      )}

      {report.status === 'failed' && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-accent-red/80">{report.errorMessage}</span>
          <button className="text-xs px-3 py-1.5 rounded-lg bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-colors shrink-0 ml-3">
            重新生成
          </button>
        </div>
      )}
    </div>
  );
}
