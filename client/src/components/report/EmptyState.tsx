interface EmptyStateProps {
  message?: string;
  icon?: 'chart' | 'check' | 'info';
  positive?: boolean;
}

export default function EmptyState({
  message = '该指标在当前数据集中无有效数据',
  icon = 'chart',
  positive = false,
}: EmptyStateProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
        positive ? 'bg-accent-green/10' : 'bg-[rgba(100,140,200,0.08)]'
      }`}>
        {icon === 'check' ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={positive ? '#34d399' : '#5a6478'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : icon === 'info' ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5a6478" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5a6478" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        )}
      </div>
      <p className={`text-xs leading-relaxed max-w-[240px] ${
        positive ? 'text-accent-green' : 'text-text-muted'
      }`}>
        {message}
      </p>
    </div>
  );
}
