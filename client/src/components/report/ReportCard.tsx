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
        'glass-card px-6 py-5 animate-fade-up',
        isClickable && 'cursor-pointer'
      )}
      data-status={report.status}
      onClick={handleClick}
    >
      {/* Header: Title + Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0 flex-1 mr-4">
          <h3 className="text-base font-semibold text-text-primary leading-snug">{report.title}</h3>
          <div className="text-xs text-text-muted mt-1.5 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-50">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{report.createdAt}</span>
            {report.duration && (
              <>
                <span className="text-text-muted/50">·</span>
                <span>耗时 {Math.floor(report.duration / 60)} 分 {report.duration % 60} 秒</span>
              </>
            )}
          </div>
        </div>
        <span
          className="text-xs font-medium px-3 py-1 rounded-full shrink-0"
          style={{
            backgroundColor: statusColor + '20',
            color: statusColor,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Meta info: Batches + Strategy count */}
      <div className="text-xs text-text-secondary mb-4 flex items-center gap-1.5 flex-wrap">
        <span className="text-text-muted font-medium">订单批次:</span>
        <span>{batches.map(b => b.name).join(', ')}</span>
        <span className="mx-1.5 text-text-muted/40">|</span>
        <span className="text-text-muted font-medium">对比策略:</span>
        <span>{strategies.length} 组</span>
      </div>

      {/* Strategy tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {strategies.map(s => (
          <span
            key={s.id}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium"
            style={{
              backgroundColor: s.color + '25',
              color: s.color,
            }}
          >
            {s.name}
          </span>
        ))}
      </div>

      {/* Completed: chart count + download buttons */}
      {report.status === 'completed' && (
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-xs text-text-muted">
            包含 {report.chartCount} 张交互式图表 · {report.kpiCount} 项 KPI 概览
          </span>
          <div className="flex gap-2.5" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => {
                const results = getSimulationResults(report.id);
                const availability = getDataAvailability(report.id);
                import('../../lib/htmlExport').then(m => m.generateHtml(report, results, strategies, batches, availability, []));
              }}
              className="text-xs px-3.5 py-1.5 rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors font-medium"
            >
              下载 HTML
            </button>
            <button
              onClick={() => {
                const results = getSimulationResults(report.id);
                const availability = getDataAvailability(report.id);
                import('../../lib/excelExport').then(m => m.generateExcel(report, results, strategies, batches, availability));
              }}
              className="text-xs px-3.5 py-1.5 rounded-lg bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-colors font-medium"
            >
              下载 Excel
            </button>
          </div>
        </div>
      )}

      {/* Generating: progress bar */}
      {report.status === 'generating' && (
        <div className="pt-3 border-t border-white/5 space-y-2.5">
          <div className="w-full h-1.5 rounded-full bg-[rgba(15,22,41,0.5)] overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-blue transition-all"
              style={{ width: `${report.progress || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-accent-blue font-medium">{report.progress}%</span>
            <span className="text-text-muted">预计剩余 {report.estimatedRemaining}</span>
          </div>
        </div>
      )}

      {/* Failed: error message + retry button */}
      {report.status === 'failed' && (
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-xs text-accent-red/80 leading-relaxed flex-1 mr-4">{report.errorMessage}</span>
          <button className="text-xs px-3.5 py-1.5 rounded-lg bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-colors shrink-0 font-medium">
            重新生成
          </button>
        </div>
      )}
    </div>
  );
}
