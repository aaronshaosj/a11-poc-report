import type { Strategy } from '../../types';

interface KpiDelta {
  strategy: Strategy;
  value: number;
  isPercent?: boolean;
}

interface KpiCardProps {
  label: string;
  baseValue: number;
  unit: string;
  deltas: KpiDelta[];
  higherIsBetter?: boolean;
}

export default function KpiCard({ label, baseValue, unit, deltas, higherIsBetter = false }: KpiCardProps) {
  return (
    <div className="glass-card p-4 flex-1 min-w-[180px]">
      <div className="text-xs text-text-muted mb-2">{label}</div>
      <div className="text-2xl font-bold text-text-primary tabular-nums mb-3">
        {typeof baseValue === 'number' ? baseValue.toLocaleString(undefined, { maximumFractionDigits: 1 }) : baseValue}
        <span className="text-sm font-normal text-text-secondary ml-1">{unit}</span>
      </div>
      <div className="space-y-1.5">
        {deltas.map(d => {
          const improved = higherIsBetter ? d.value > 0 : d.value < 0;
          const arrow = d.value > 0 ? '↑' : d.value < 0 ? '↓' : '→';
          const color = improved ? 'text-accent-green' : d.value === 0 ? 'text-text-muted' : 'text-accent-red';
          const displayVal = d.isPercent
            ? `${Math.abs(d.value).toFixed(1)}%`
            : Math.abs(d.value).toLocaleString(undefined, { maximumFractionDigits: 1 });

          return (
            <div key={d.strategy.id} className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: d.strategy.color }}
              />
              <span className="text-text-secondary truncate flex-1">{d.strategy.name}</span>
              <span className={`font-medium tabular-nums ${color}`}>
                {arrow} {displayVal}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
