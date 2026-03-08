import { useState } from 'react';
import { createPortal } from 'react-dom';
import { mockBatches } from '../../data/mockBatches';
import { mockStrategies } from '../../data/mockStrategies';
import type { OrderBatch, Strategy } from '../../types';
import { cn } from '../../lib/utils';

interface GenerateModalProps {
  open: boolean;
  onClose: () => void;
}

export default function GenerateModal({ open, onClose }: GenerateModalProps) {
  const [step, setStep] = useState(1);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>(['s1']);
  const [generating, setGenerating] = useState(false);

  if (!open) return null;

  const manualStrategy = mockStrategies.find(s => s.type === 'manual')!;
  const algoStrategies = mockStrategies.filter(s => s.type === 'algorithm');
  const allBatchesSelected = selectedBatches.length === mockBatches.length;

  const toggleBatch = (id: string) => {
    setSelectedBatches(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAllBatches = () => {
    setSelectedBatches(allBatchesSelected ? [] : mockBatches.map(b => b.id));
  };

  const toggleStrategy = (id: string) => {
    if (id === 's1') return; // manual cannot be toggled
    setSelectedStrategies(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    setGenerating(true);
  };

  const handleBackground = () => {
    setGenerating(false);
    setStep(1);
    setSelectedBatches([]);
    setSelectedStrategies(['s1']);
    onClose();
  };

  const selectedBatchList = mockBatches.filter(b => selectedBatches.includes(b.id));
  const selectedStrategyList = mockStrategies.filter(s => selectedStrategies.includes(s.id));

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={generating ? undefined : onClose} />

      <div className="relative w-full max-w-lg mx-4 glass-card overflow-hidden" style={{ border: '1px solid rgba(100,140,200,0.2)' }}>
        {generating ? (
          <div className="p-12 flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full border-2 border-accent-blue/30 border-t-accent-blue animate-spin-slow" />
            <div className="text-center">
              <div className="text-base font-semibold text-text-primary mb-1">正在生成报告...</div>
              <div className="text-sm text-text-secondary">预计耗时 2-3 分钟</div>
            </div>
            <button
              onClick={handleBackground}
              className="text-sm px-5 py-2 rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors"
            >
              后台运行
            </button>
          </div>
        ) : (
          <>
            {/* Step indicator */}
            <div className="px-6 pt-5 pb-3 border-b border-border-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-text-primary">生成 POC 报告</h2>
                <button onClick={onClose} className="text-text-muted hover:text-text-secondary text-lg leading-none">&times;</button>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                      step >= s ? 'bg-accent-blue text-white' : 'bg-[rgba(100,140,200,0.1)] text-text-muted'
                    )}>
                      {s}
                    </div>
                    <span className={cn(
                      'text-xs truncate',
                      step >= s ? 'text-text-primary' : 'text-text-muted'
                    )}>
                      {s === 1 ? '选择批次' : s === 2 ? '选择策略' : '确认生成'}
                    </span>
                    {s < 3 && <div className="flex-1 h-px bg-border-card" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Step content */}
            <div className="p-6 max-h-[400px] overflow-y-auto">
              {step === 1 && (
                <StepBatches
                  batches={mockBatches}
                  selected={selectedBatches}
                  onToggle={toggleBatch}
                  onToggleAll={toggleAllBatches}
                  allSelected={allBatchesSelected}
                />
              )}
              {step === 2 && (
                <StepStrategies
                  manual={manualStrategy}
                  algorithms={algoStrategies}
                  selected={selectedStrategies}
                  onToggle={toggleStrategy}
                />
              )}
              {step === 3 && (
                <StepConfirm batches={selectedBatchList} strategies={selectedStrategyList} />
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border-card flex justify-between">
              <button
                onClick={() => setStep(s => s - 1)}
                className={cn(
                  'text-sm px-4 py-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors',
                  step === 1 && 'invisible'
                )}
              >
                上一步
              </button>
              {step < 3 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 1 && selectedBatches.length === 0}
                  className="text-sm px-5 py-2 rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  下一步
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  className="text-sm px-5 py-2 rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90 transition-colors"
                >
                  开始生成
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

function StepBatches({ batches, selected, onToggle, onToggleAll, allSelected }: {
  batches: OrderBatch[];
  selected: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">已选择 {selected.length} 个批次</span>
        <button onClick={onToggleAll} className="text-xs text-accent-blue hover:underline">
          {allSelected ? '取消全选' : '全选'}
        </button>
      </div>
      <div className="space-y-2">
        {batches.map(b => (
          <label
            key={b.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
              selected.includes(b.id)
                ? 'bg-accent-blue/10 border border-accent-blue/30'
                : 'bg-[rgba(15,22,41,0.3)] border border-transparent hover:border-border-card'
            )}
          >
            <input
              type="checkbox"
              checked={selected.includes(b.id)}
              onChange={() => onToggle(b.id)}
              className="accent-[#4a9eff]"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-text-primary">{b.name}</div>
              <div className="text-xs text-text-muted mt-0.5">
                {b.orderCount} 订单 · {b.stopCount} 站点 · {b.date}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function StepStrategies({ manual, algorithms, selected, onToggle }: {
  manual: Strategy;
  algorithms: Strategy[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {/* Manual strategy - always selected */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-accent-orange/10 border border-accent-orange/30">
        <input type="checkbox" checked disabled className="accent-[#f59e0b]" />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: manual.color }} />
        <div className="flex-1">
          <div className="text-sm font-medium text-text-primary flex items-center gap-2">
            {manual.name}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-orange/20 text-accent-orange">基准</span>
          </div>
        </div>
      </div>

      {algorithms.map(s => (
        <label
          key={s.id}
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
            selected.includes(s.id)
              ? 'bg-accent-blue/10 border border-accent-blue/30'
              : 'bg-[rgba(15,22,41,0.3)] border border-transparent hover:border-border-card'
          )}
        >
          <input
            type="checkbox"
            checked={selected.includes(s.id)}
            onChange={() => onToggle(s.id)}
            className="accent-[#4a9eff]"
          />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
          <div className="flex-1">
            <div className="text-sm font-medium text-text-primary flex items-center gap-2">
              {s.name}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-blue/15 text-accent-blue">算法</span>
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              迭代 {s.iterations} 轮 · 节降 {s.savingsRate}%
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}

function StepConfirm({ batches, strategies }: {
  batches: OrderBatch[];
  strategies: Strategy[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-text-muted mb-2">订单批次 ({batches.length})</div>
        <div className="flex flex-wrap gap-1.5">
          {batches.map(b => (
            <span key={b.id} className="text-xs px-2 py-1 rounded-md bg-[rgba(100,140,200,0.1)] text-text-secondary">
              {b.name}
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs text-text-muted mb-2">对比策略 ({strategies.length})</div>
        <div className="flex flex-wrap gap-1.5">
          {strategies.map(s => (
            <span
              key={s.id}
              className="text-xs px-2 py-1 rounded-md font-medium"
              style={{ backgroundColor: s.color + '20', color: s.color }}
            >
              {s.name}
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs text-text-muted mb-1">预估耗时</div>
        <div className="text-sm text-text-primary">约 2-3 分钟</div>
      </div>
      <div className="text-xs text-text-muted bg-[rgba(100,140,200,0.05)] p-3 rounded-lg">
        报告生成为异步过程，您可以安全离开此页面。生成完成后将自动更新报告列表。
      </div>
    </div>
  );
}
