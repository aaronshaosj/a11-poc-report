import type { ProjectConstraints } from '../types';

export const mockConstraints: ProjectConstraints = {
  global: {
    maxDurationLimit: 600,        // 10 hours
    maxDistanceLimit: 300,        // 300km
    maxCrossRegionLimit: 3,       // max 3 regions
    maxStopLimit: 20,             // max 20 stops
  },
  byVehicleType: {
    '4.2米冷藏': {
      maxWeightLimit: 2000,       // 2t
      maxVolumeLimit: 16,         // 16m³
      maxQtyLimit: 500,           // 500 pcs
    },
    '6.8米冷藏': {
      maxWeightLimit: 5000,
      maxVolumeLimit: 34,
      maxQtyLimit: 1200,
    },
    '9.6米冷藏': {
      maxWeightLimit: 8000,
      maxVolumeLimit: 55,
      maxQtyLimit: 2000,
    },
    '4.2米厢式': {
      maxWeightLimit: 1800,
      maxVolumeLimit: 14,
      maxQtyLimit: 400,
    },
  },
};
