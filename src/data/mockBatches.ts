import type { OrderBatch } from '../types';

export const mockBatches: OrderBatch[] = [
  { id: 'b1', name: '17-1',   orderCount: 150, stopCount: 116, totalWeight: 71557, totalVolume: 231.78, date: '2026-01-17' },
  { id: 'b2', name: '苏南17', orderCount: 150, stopCount: 116, totalWeight: 71557, totalVolume: 231.78, date: '2026-02-17' },
  { id: 'b3', name: '苏南18', orderCount: 180, stopCount: 132, totalWeight: 85200, totalVolume: 276.50, date: '2026-02-18' },
  { id: 'b4', name: '苏南19', orderCount: 165, stopCount: 120, totalWeight: 78450, totalVolume: 254.30, date: '2026-02-19' },
  { id: 'b5', name: '苏南20', orderCount: 142, stopCount: 108, totalWeight: 67300, totalVolume: 218.60, date: '2026-02-20' },
];
