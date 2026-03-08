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

      <main className="max-w-[960px] mx-auto px-8 pt-28 pb-20">
        {/* Header section */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              POC 对比报告
            </h1>
            <p className="text-sm text-text-secondary mt-2.5 leading-relaxed max-w-md">
              管理和查看算法调度与人工调度的量化对比分析报告
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="text-sm px-5 py-2.5 rounded-lg bg-accent-blue text-white font-medium hover:bg-accent-blue/90 transition-all hover:shadow-[0_0_20px_rgba(74,158,255,0.2)] flex items-center gap-2 shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            生成 POC 报告
          </button>
        </div>

        {/* Divider with count */}
        <div className="flex items-center gap-4 mb-8">
          <span className="text-xs text-text-muted tracking-wide">
            共 {mockReports.length} 份报告
          </span>
          <span className="flex-1 h-px bg-gradient-to-r from-border-card to-transparent" />
        </div>

        {/* Report cards */}
        <div className="flex flex-col gap-5">
          {mockReports.map((report, i) => (
            <div key={report.id} style={{ animationDelay: `${i * 0.06}s` }}>
              <ReportCard report={report} />
            </div>
          ))}
        </div>
      </main>

      <GenerateModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
