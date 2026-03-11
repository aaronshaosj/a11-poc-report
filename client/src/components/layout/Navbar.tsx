import { useLocation } from 'wouter';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';

interface NavbarProps {
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export default function Navbar({ breadcrumb, actions }: NavbarProps) {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { currentProject, projects, setCurrentProjectId } = useProject();

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

        {/* Project selector */}
        {projects.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-text-muted text-sm">/</span>
            <select
              value={currentProject ? String(currentProject.id) : ""}
              onChange={(e) => setCurrentProjectId(e.target.value || null)}
              className="text-xs bg-transparent border border-border-card rounded-md px-2 py-1 text-text-primary outline-none focus:border-accent-blue/50 cursor-pointer max-w-[180px] truncate"
            >
              <option value="">选择项目</option>
              {projects.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

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

      <div className="flex items-center gap-2 shrink-0">
        {actions}

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border-card">
            <div className="w-6 h-6 rounded-full bg-accent-blue/20 flex items-center justify-center">
              <span className="text-[10px] font-medium text-accent-blue">
                {user.name?.charAt(0) || 'U'}
              </span>
            </div>
            <span className="text-xs text-text-secondary hidden sm:inline max-w-[80px] truncate">
              {user.name}
            </span>
            <button
              onClick={logout}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors p-1"
              title="退出登录"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
