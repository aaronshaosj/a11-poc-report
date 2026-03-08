import { useRef, useState, useEffect } from 'react';
import AiInsight from './AiInsight';
import EmptyState from './EmptyState';

interface ChartCardProps {
  title: string;
  insight?: string;
  height?: number;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyPositive?: boolean;
  children?: React.ReactNode;
}

export default function ChartCard({
  title,
  insight,
  height = 320,
  isEmpty = false,
  emptyMessage,
  emptyPositive = false,
  children,
}: ChartCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="glass-card p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">{title}</h3>
      <div style={{ height }}>
        {isEmpty ? (
          <EmptyState
            message={emptyMessage}
            icon={emptyPositive ? 'check' : 'chart'}
            positive={emptyPositive}
          />
        ) : visible ? children : (
          <div className="animate-pulse w-full h-full flex flex-col items-center justify-center gap-3">
            <div className="w-full h-full bg-white/5 rounded-lg" />
          </div>
        )}
      </div>
      {insight && <AiInsight text={insight} />}
    </div>
  );
}
