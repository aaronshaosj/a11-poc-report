export interface OrderBatch {
  id: string;
  name: string;
  orderCount: number;
  stopCount: number;
  totalWeight: number;
  totalVolume: number;
  date: string;
}

export interface Strategy {
  id: string;
  name: string;
  type: 'manual' | 'algorithm';
  iterations?: number;
  savingsRate?: number;
  color: string;
}

export interface VehicleDetail {
  vehicleId: string;
  vehicleType: string;
  orderCount: number;
  stopCount: number;
  distance: number;
  duration: number;
  loadRate: number;
  routeSpan: number;
  crossRegionCount: number;
  topKAvg: number;
  maxStopInterval: number;
  weightUtil: number;
  volumeUtil: number;
  palletUtil: number;
  qtyUtil: number;
}

export interface SimulationResult {
  batchId: string;
  strategyId: string;
  vehicleCount: number;
  totalDistance: number;
  totalDuration: number;
  avgLoadRate: number;
  maxDistance: number;
  maxDuration: number;
  maxStopInterval: number;
  vehicleDetails: VehicleDetail[];
}

export interface PocReport {
  id: string;
  title: string;
  status: 'completed' | 'generating' | 'failed';
  batchIds: string[];
  strategyIds: string[];
  chartCount: number;
  kpiCount: number;
  createdAt: string;
  completedAt?: string;
  duration?: number;
  errorMessage?: string;
  progress?: number;
  estimatedRemaining?: string;
}
