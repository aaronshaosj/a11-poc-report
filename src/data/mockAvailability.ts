import type { DataAvailability } from '../types';

export const mockDataAvailability: DataAvailability = {
  // Economic
  hasMultiVehicleTypes: true,
  hasCostStructure: false,        // no billing structure in this project
  hasMultiBatches: true,
  // Constraints
  hasDurationLimit: true,
  hasDistanceLimit: true,
  hasWeightLimit: true,
  hasVolumeLimit: true,
  hasQtyLimit: true,
  hasPalletLimit: false,          // no pallet tracking
  hasCrossRegionLimit: true,
  hasStopLimit: true,
  // Feasibility
  hasRouteSpan: true,
  hasCrossRegion: true,
  hasDetourRatio: true,
  hasTopK: true,
  hasStopInterval: true,
  hasRouteOverlap: false,         // no overlap detection yet
};
