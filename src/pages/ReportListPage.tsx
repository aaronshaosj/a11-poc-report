import { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import ReportCard from '../components/report/ReportCard';
import GenerateModal from '../components/generate/GenerateModal';
import { mockReports } from '../data/mockReports';

export default function ReportListPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Navbar
        breadcrumb={[{ label: 'POC 报告' }]}
      />

      <main className="max-w-4xl mx-auto px-6 pt-20 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary">POC 对比报告</h1>
            <p className="text-sm text-text-secondary mt-1">
              管理和查看算法调度与人工调度的量化对比分析报告
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="text-sm px-4 py-2.5 rounded-lg bg-accent-blue text-white font-medium hover:bg-accent-blue/90 transition-colors flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            生成 POC 报告
          </button>
        </div>

        <div className="space-y-4">
          {mockReports.map((report, i) => (
            <div key={report.id} style={{ animationDelay: `${i * 0.08}s` }}>
              <ReportCard report={report} />
            </div>
          ))}
        </div>
      </main>

      <GenerateModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
