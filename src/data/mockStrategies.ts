import type { Strategy } from '../types';

export const mockStrategies: Strategy[] = [
  { id: 's1', name: '人工经验策略', type: 'manual', color: '#f59e0b' },
  { id: 's2', name: '均衡优化 v2.1', type: 'algorithm', iterations: 12, savingsRate: 8.2, color: '#4a9eff' },
  { id: 's3', name: '里程优先 v1.3', type: 'algorithm', iterations: 8, savingsRate: 11.5, color: '#34d399' },
  { id: 's4', name: '时效优先 v1.0', type: 'algorithm', iterations: 5, savingsRate: 3.1, color: '#8b5cf6' },
  { id: 's5', name: '满载优先 v1.1', type: 'algorithm', iterations: 6, savingsRate: 5.8, color: '#f43f5e' },
];
