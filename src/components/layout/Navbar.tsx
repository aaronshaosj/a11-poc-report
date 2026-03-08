import { useLocation } from 'wouter';

interface NavbarProps {
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export default function Navbar({ breadcrumb, actions }: NavbarProps) {
  const [, navigate] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-6 backdrop-blur-xl bg-[rgba(10,14,26,0.85)] border-b border-border-card">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="flex items-center gap-2 cursor-pointer shrink-0"
          onClick={() => navigate('/')}
        >
          <div className="w-7 h-7 rounded-lg bg-accent-blue/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a9eff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h18v18H3z" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-text-primary">C-ROS</span>
        </div>

        {breadcrumb && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-text-secondary min-w-0">
            {breadcrumb.map((item, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                <span className="text-text-muted">/</span>
                {item.href ? (
                  <span
                    className="cursor-pointer hover:text-text-primary transition-colors truncate"
                    onClick={() => navigate(item.href!)}
                  >
                    {item.label}
                  </span>
                ) : (
                  <span className="text-text-primary truncate">{item.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </nav>
  );
}
