import { Route, Switch } from 'wouter';
import ReportListPage from './pages/ReportListPage';
import ReportDetailPage from './pages/ReportDetailPage';

export default function App() {
  return (
    <Switch>
      <Route path="/" component={ReportListPage} />
      <Route path="/report/:id" component={ReportDetailPage} />
      <Route>
        <div className="min-h-screen flex items-center justify-center text-text-secondary">
          页面不存在
        </div>
      </Route>
    </Switch>
  );
}
