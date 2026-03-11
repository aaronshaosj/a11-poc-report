import { Route, Switch } from 'wouter';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import ReportListPage from './pages/ReportListPage';
import ReportDetailPage from './pages/ReportDetailPage';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, authenticated, redirectToLogin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm text-text-secondary">验证登录状态...</div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card px-8 py-10 text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-accent-blue/10 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4a9eff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">需要登录</h2>
          <p className="text-sm text-text-secondary mb-6">
            请通过 C-ROS Workbench 登录后访问 POC 报告系统
          </p>
          <button
            onClick={redirectToLogin}
            className="w-full px-4 py-2.5 rounded-lg bg-accent-blue text-white text-sm font-medium hover:bg-accent-blue/90 transition-colors"
          >
            前往 Workbench 登录
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <AuthGuard>
      <ProjectProvider>
        <Switch>
          <Route path="/" component={ReportListPage} />
          <Route path="/report/:id" component={ReportDetailPage} />
          <Route>
            <div className="min-h-screen flex items-center justify-center text-text-secondary">
              页面不存在
            </div>
          </Route>
        </Switch>
      </ProjectProvider>
    </AuthGuard>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
