import { useScrollSpy } from '../../hooks/useScrollSpy';
import { cn } from '../../lib/utils';

const sections = [
  { id: 'kpi', label: 'KPI 概览' },
  { id: 'type-a', label: 'Type A · 边界类' },
  { id: 'type-b', label: 'Type B · 形态类' },
  { id: 'type-c', label: 'Type C · 综合效能' },
];

export default function FloatingNav() {
  const activeId = useScrollSpy(sections.map(s => s.id));

  const handleClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col gap-1">
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => handleClick(s.id)}
          className={cn(
            'text-xs px-3 py-2 rounded-lg text-right transition-all whitespace-nowrap',
            activeId === s.id
              ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
              : 'text-text-muted hover:text-text-secondary hover:bg-[rgba(15,22,41,0.5)]'
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
