import type { DataAvailability } from '../types';

export const mockDataAvailability: DataAvailability = {
  // Economic
  hasMultiVehicleTypes: true,
  hasCostStructure: false,
  hasMultiBatches: true,
  // Constraints
  hasDurationLimit: true,
  hasDistanceLimit: true,
  hasWeightLimit: true,
  hasVolumeLimit: true,
  hasQtyLimit: true,
  hasPalletLimit: false,
  hasCrossRegionLimit: true,
  hasStopLimit: true,
  // Feasibility
  hasRouteSpan: true,
  hasCrossRegion: true,
  hasDetourRatio: true,
  hasTopK: true,
  hasStopInterval: true,
  hasRouteOverlap: false,
};

// Per-report availability configs for edge case reports
const reportAvailabilityMap: Record<string, DataAvailability> = {
  // r5: single-strategy report — same availability
  r5: { ...mockDataAvailability },
  // r6: single-batch report — disable multi-batch features
  r6: { ...mockDataAvailability, hasMultiBatches: false },
  // r7: zero-violation report — same availability
  r7: { ...mockDataAvailability },
};

export function getDataAvailability(reportId: string): DataAvailability {
  return reportAvailabilityMap[reportId] || mockDataAvailability;
}
