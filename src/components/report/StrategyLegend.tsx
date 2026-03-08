import type { Strategy } from '../../types';

interface StrategyLegendProps {
  strategies: Strategy[];
}

export default function StrategyLegend({ strategies }: StrategyLegendProps) {
  return (
    <div className="glass-card px-5 py-3 flex flex-wrap items-center gap-4">
      <span className="text-xs text-text-muted mr-1">对比策略:</span>
      {strategies.map(s => (
        <div key={s.id} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
          <span className="text-sm text-text-secondary">{s.name}</span>
          {s.type === 'manual' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-orange/15 text-accent-orange">
              基准
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
