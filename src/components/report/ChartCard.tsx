import { useRef, useState, useEffect } from 'react';
import AiInsight from './AiInsight';

interface ChartCardProps {
  title: string;
  insight: string;
  height?: number;
  children: React.ReactNode;
}

export default function ChartCard({ title, insight, height = 320, children }: ChartCardProps) {
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
        {visible ? children : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
            加载中...
          </div>
        )}
      </div>
      <AiInsight text={insight} />
    </div>
  );
}
