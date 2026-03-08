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
  // === V1 fields ===
  vehicleId: string;
  vehicleType: string;
  orderCount: number;
  stopCount: number;
  distance: number;           // km
  duration: number;           // min
  loadRate: number;           // %
  routeSpan: number;
  crossRegionCount: number;
  topKAvg: number;
  maxStopInterval: number;
  weightUtil: number;
  volumeUtil: number;
  palletUtil: number;
  qtyUtil: number;

  // === V2: load details ===
  weightLoad: number;         // kg
  volumeLoad: number;         // m³
  qtyLoad: number;            // pieces
  palletLoad?: number;        // pallets (optional)

  // === V2: constraint over-limit ===
  durationOverLimit?: number;
  distanceOverLimit?: number;
  weightOverLimit?: number;
  volumeOverLimit?: number;
  qtyOverLimit?: number;
  crossRegionOverLimit?: number;
  stopOverLimit?: number;

  // === V2: feasibility ===
  detourRatio?: number;       // %
  routeOverlapCount?: number;
}

export interface ConstraintViolation {
  type: string;
  violatedCount: number;
  totalCount: number;
  violationRate: number;
  maxOverage: number;
  avgOverage: number;
}

export interface SimulationResult {
  // === V1 fields ===
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

  // === V2 fields ===
  vehicleCountByType?: Record<string, number>;
  avgLoadRateByType?: Record<string, number>;
  totalCost?: number;
  costByType?: Record<string, number>;
  constraintViolations: ConstraintViolation[];
}

export interface ConstraintConfig {
  maxDurationLimit?: number;
  maxDistanceLimit?: number;
  maxWeightLimit?: number;
  maxVolumeLimit?: number;
  maxQtyLimit?: number;
  maxPalletLimit?: number;
  maxCrossRegionLimit?: number;
  maxStopLimit?: number;
}

export interface ProjectConstraints {
  global: ConstraintConfig;
  byVehicleType?: Record<string, ConstraintConfig>;
}

export interface DataAvailability {
  // Economic
  hasMultiVehicleTypes: boolean;
  hasCostStructure: boolean;
  hasMultiBatches: boolean;
  // Constraints
  hasDurationLimit: boolean;
  hasDistanceLimit: boolean;
  hasWeightLimit: boolean;
  hasVolumeLimit: boolean;
  hasQtyLimit: boolean;
  hasPalletLimit: boolean;
  hasCrossRegionLimit: boolean;
  hasStopLimit: boolean;
  // Feasibility
  hasRouteSpan: boolean;
  hasCrossRegion: boolean;
  hasDetourRatio: boolean;
  hasTopK: boolean;
  hasStopInterval: boolean;
  hasRouteOverlap: boolean;
}

export interface ScoringWeights {
  economic: number;    // default 0.4
  constraint: number;  // default 0.3
  feasibility: number; // default 0.3
}

export const defaultScoringWeights: ScoringWeights = {
  economic: 0.4,
  constraint: 0.3,
  feasibility: 0.3,
};

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
