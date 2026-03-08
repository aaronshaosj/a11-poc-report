import type { SimulationResult, VehicleDetail, ConstraintViolation } from '../types';
import { seededRandom, gaussianRandom } from '../lib/utils';
import { mockConstraints } from './mockConstraints';

interface StrategyProfile {
  distanceMean: number;
  distanceStd: number;
  durationMean: number;
  durationStd: number;
  loadRateMean: number;
  loadRateStd: number;
  orderCountMean: number;
  orderCountStd: number;
  routeSpanMean: number;
  routeSpanStd: number;
  crossRegionMean: number;
  topKAvgMean: number;
  topKAvgStd: number;
  stopIntervalMean: number;
  stopIntervalStd: number;
  vehicleCountFactor: number;
  // V2: constraint violation tendency
  durationOverLimitChance: number;  // probability of exceeding duration limit
  distanceOverLimitChance: number;
  weightOverLimitChance: number;
  crossRegionOverLimitChance: number;
  detourRatioMean: number;
  detourRatioStd: number;
}

const profiles: Record<string, StrategyProfile> = {
  s1: { // Manual - experience-based
    distanceMean: 95, distanceStd: 28,
    durationMean: 285, durationStd: 65,
    loadRateMean: 95.5, loadRateStd: 4,
    orderCountMean: 7.2, orderCountStd: 2.5,
    routeSpanMean: 42, routeSpanStd: 15,
    crossRegionMean: 1.8, topKAvgMean: 5.2, topKAvgStd: 2.0,
    stopIntervalMean: 12, stopIntervalStd: 5,
    vehicleCountFactor: 1.0,
    durationOverLimitChance: 0.08,
    distanceOverLimitChance: 0.03,
    weightOverLimitChance: 0.05,
    crossRegionOverLimitChance: 0.06,
    detourRatioMean: 125, detourRatioStd: 15,
  },
  s2: { // Balanced optimization
    distanceMean: 85, distanceStd: 22,
    durationMean: 260, durationStd: 50,
    loadRateMean: 96.2, loadRateStd: 3,
    orderCountMean: 7.5, orderCountStd: 2.2,
    routeSpanMean: 38, routeSpanStd: 12,
    crossRegionMean: 1.4, topKAvgMean: 4.5, topKAvgStd: 1.6,
    stopIntervalMean: 10, stopIntervalStd: 4,
    vehicleCountFactor: 0.95,
    durationOverLimitChance: 0.02,
    distanceOverLimitChance: 0.01,
    weightOverLimitChance: 0.02,
    crossRegionOverLimitChance: 0.03,
    detourRatioMean: 112, detourRatioStd: 10,
  },
  s3: { // Distance-first
    distanceMean: 78, distanceStd: 20,
    durationMean: 275, durationStd: 55,
    loadRateMean: 94.0, loadRateStd: 5,
    orderCountMean: 7.0, orderCountStd: 2.4,
    routeSpanMean: 35, routeSpanStd: 11,
    crossRegionMean: 1.6, topKAvgMean: 4.0, topKAvgStd: 1.4,
    stopIntervalMean: 9, stopIntervalStd: 3.5,
    vehicleCountFactor: 1.0,
    durationOverLimitChance: 0.0,
    distanceOverLimitChance: 0.0,
    weightOverLimitChance: 0.03,
    crossRegionOverLimitChance: 0.05,
    detourRatioMean: 108, detourRatioStd: 8,
  },
  s4: { // Time-first
    distanceMean: 90, distanceStd: 25,
    durationMean: 240, durationStd: 45,
    loadRateMean: 93.5, loadRateStd: 5,
    orderCountMean: 6.8, orderCountStd: 2.3,
    routeSpanMean: 40, routeSpanStd: 14,
    crossRegionMean: 1.5, topKAvgMean: 4.8, topKAvgStd: 1.8,
    stopIntervalMean: 11, stopIntervalStd: 4.5,
    vehicleCountFactor: 1.05,
    durationOverLimitChance: 0.0,
    distanceOverLimitChance: 0.02,
    weightOverLimitChance: 0.04,
    crossRegionOverLimitChance: 0.04,
    detourRatioMean: 118, detourRatioStd: 12,
  },
  s5: { // Load-first
    distanceMean: 92, distanceStd: 24,
    durationMean: 270, durationStd: 55,
    loadRateMean: 97.5, loadRateStd: 2.5,
    orderCountMean: 7.8, orderCountStd: 2.0,
    routeSpanMean: 44, routeSpanStd: 16,
    crossRegionMean: 2.0, topKAvgMean: 5.5, topKAvgStd: 2.2,
    stopIntervalMean: 13, stopIntervalStd: 5,
    vehicleCountFactor: 0.92,
    durationOverLimitChance: 0.04,
    distanceOverLimitChance: 0.02,
    weightOverLimitChance: 0.07,
    crossRegionOverLimitChance: 0.08,
    detourRatioMean: 130, detourRatioStd: 18,
  },
};

const vehicleTypes = ['4.2米冷藏', '6.8米冷藏', '9.6米冷藏', '4.2米厢式'];

// Weight capacity lookup for computing loads
const weightCapacity: Record<string, number> = {
  '4.2米冷藏': 2000, '6.8米冷藏': 5000, '9.6米冷藏': 8000, '4.2米厢式': 1800,
};
const volumeCapacity: Record<string, number> = {
  '4.2米冷藏': 16, '6.8米冷藏': 34, '9.6米冷藏': 55, '4.2米厢式': 14,
};
const qtyCapacity: Record<string, number> = {
  '4.2米冷藏': 500, '6.8米冷藏': 1200, '9.6米冷藏': 2000, '4.2米厢式': 400,
};

function getConstraintLimit(vehicleType: string, field: keyof typeof mockConstraints.global): number | undefined {
  const byType = mockConstraints.byVehicleType?.[vehicleType];
  if (byType && (byType as Record<string, number | undefined>)[field] !== undefined) {
    return (byType as Record<string, number | undefined>)[field] as number;
  }
  return (mockConstraints.global as Record<string, number | undefined>)[field] as number | undefined;
}

function generateVehicleDetails(
  batchId: string,
  strategyId: string,
  count: number
): VehicleDetail[] {
  const profile = profiles[strategyId] || profiles.s1;
  const seed = hashCode(batchId + strategyId);
  const rand = seededRandom(seed);
  const details: VehicleDetail[] = [];

  for (let i = 0; i < count; i++) {
    const distance = Math.max(20, gaussianRandom(rand, profile.distanceMean, profile.distanceStd));
    const duration = Math.max(60, gaussianRandom(rand, profile.durationMean, profile.durationStd));
    const loadRate = Math.min(100, Math.max(60, gaussianRandom(rand, profile.loadRateMean, profile.loadRateStd)));
    const orderCount = Math.max(2, Math.round(gaussianRandom(rand, profile.orderCountMean, profile.orderCountStd)));
    const stopCount = Math.max(2, Math.round(orderCount * (0.7 + rand() * 0.5)));
    const routeSpan = Math.max(10, gaussianRandom(rand, profile.routeSpanMean, profile.routeSpanStd));
    const crossRegionCount = Math.max(0, Math.round(gaussianRandom(rand, profile.crossRegionMean, 0.8)));
    const topKAvg = Math.max(1, gaussianRandom(rand, profile.topKAvgMean, profile.topKAvgStd));
    const maxStopInterval = Math.max(2, gaussianRandom(rand, profile.stopIntervalMean, profile.stopIntervalStd));

    const weightUtil = Math.min(100, Math.max(40, loadRate + gaussianRandom(rand, -3, 5)));
    const volumeUtil = Math.min(100, Math.max(30, loadRate + gaussianRandom(rand, -8, 6)));
    const palletUtil = Math.min(100, Math.max(35, loadRate + gaussianRandom(rand, -5, 7)));
    const qtyUtil = Math.min(100, Math.max(45, loadRate + gaussianRandom(rand, -2, 4)));

    const vType = vehicleTypes[Math.floor(rand() * vehicleTypes.length)];

    // V2: compute actual load values from util percentages
    const wCap = weightCapacity[vType] || 2000;
    const vCap = volumeCapacity[vType] || 16;
    const qCap = qtyCapacity[vType] || 500;
    const weightLoad = +(wCap * weightUtil / 100).toFixed(0);
    const volumeLoad = +(vCap * volumeUtil / 100).toFixed(1);
    const qtyLoad = Math.round(qCap * qtyUtil / 100);

    // V2: constraint over-limit calculation
    const durationLimit = getConstraintLimit(vType, 'maxDurationLimit');
    const distanceLimit = getConstraintLimit(vType, 'maxDistanceLimit');
    const weightLimit = getConstraintLimit(vType, 'maxWeightLimit');
    const volumeLimit = getConstraintLimit(vType, 'maxVolumeLimit');
    const qtyLimit = getConstraintLimit(vType, 'maxQtyLimit');
    const crossRegionLimit = getConstraintLimit(vType, 'maxCrossRegionLimit');
    const stopLimit = getConstraintLimit(vType, 'maxStopLimit');

    // Apply over-limit with probability from profile
    let durationOverLimit: number | undefined;
    if (durationLimit && rand() < profile.durationOverLimitChance) {
      durationOverLimit = +Math.max(1, gaussianRandom(rand, 25, 15)).toFixed(0);
    }

    let distanceOverLimit: number | undefined;
    if (distanceLimit && distance > distanceLimit * 0.95 && rand() < profile.distanceOverLimitChance * 3) {
      distanceOverLimit = +Math.max(1, gaussianRandom(rand, 15, 8)).toFixed(1);
    }

    let weightOverLimit: number | undefined;
    if (weightLimit && rand() < profile.weightOverLimitChance) {
      weightOverLimit = +Math.max(10, gaussianRandom(rand, 80, 40)).toFixed(0);
    }

    let volumeOverLimit: number | undefined;
    if (volumeLimit && rand() < profile.weightOverLimitChance * 0.6) {
      volumeOverLimit = +Math.max(0.1, gaussianRandom(rand, 0.8, 0.4)).toFixed(1);
    }

    let qtyOverLimit: number | undefined;
    if (qtyLimit && rand() < profile.weightOverLimitChance * 0.4) {
      qtyOverLimit = Math.max(1, Math.round(gaussianRandom(rand, 15, 8)));
    }

    let crossRegionOverLimit: number | undefined;
    if (crossRegionLimit && crossRegionCount > crossRegionLimit) {
      crossRegionOverLimit = crossRegionCount - crossRegionLimit;
    }

    let stopOverLimit: number | undefined;
    if (stopLimit && stopCount > stopLimit) {
      stopOverLimit = stopCount - stopLimit;
    }

    // V2: detour ratio
    const detourRatio = +Math.max(100, gaussianRandom(rand, profile.detourRatioMean, profile.detourRatioStd)).toFixed(1);

    details.push({
      vehicleId: `V${batchId}-${strategyId}-${String(i + 1).padStart(3, '0')}`,
      vehicleType: vType,
      orderCount,
      stopCount,
      distance: +distance.toFixed(1),
      duration: +duration.toFixed(0),
      loadRate: +loadRate.toFixed(1),
      routeSpan: +routeSpan.toFixed(1),
      crossRegionCount,
      topKAvg: +topKAvg.toFixed(2),
      maxStopInterval: +maxStopInterval.toFixed(1),
      weightUtil: +weightUtil.toFixed(1),
      volumeUtil: +volumeUtil.toFixed(1),
      palletUtil: +palletUtil.toFixed(1),
      qtyUtil: +qtyUtil.toFixed(1),
      // V2 new fields
      weightLoad,
      volumeLoad,
      qtyLoad,
      durationOverLimit,
      distanceOverLimit,
      weightOverLimit,
      volumeOverLimit,
      qtyOverLimit,
      crossRegionOverLimit,
      stopOverLimit,
      detourRatio,
    });
  }
  return details;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

const baseVehicleCounts: Record<string, number> = {
  b1: 22, b2: 21, b3: 25, b4: 23, b5: 20,
};

function computeConstraintViolations(details: VehicleDetail[]): ConstraintViolation[] {
  const total = details.length;
  const violations: ConstraintViolation[] = [];

  const checks: { type: string; field: keyof VehicleDetail }[] = [
    { type: '工作时长', field: 'durationOverLimit' },
    { type: '行驶里程', field: 'distanceOverLimit' },
    { type: '装载重量', field: 'weightOverLimit' },
    { type: '装载体积', field: 'volumeOverLimit' },
    { type: '装载件数', field: 'qtyOverLimit' },
    { type: '跨区数量', field: 'crossRegionOverLimit' },
    { type: '卸货点数', field: 'stopOverLimit' },
  ];

  for (const check of checks) {
    const violated = details.filter(d => {
      const val = d[check.field];
      return val !== undefined && val !== null && (val as number) > 0;
    });
    if (violated.length > 0) {
      const overages = violated.map(d => d[check.field] as number);
      violations.push({
        type: check.type,
        violatedCount: violated.length,
        totalCount: total,
        violationRate: +(violated.length / total * 100).toFixed(1),
        maxOverage: +Math.max(...overages).toFixed(1),
        avgOverage: +(overages.reduce((s, v) => s + v, 0) / overages.length).toFixed(1),
      });
    }
  }

  return violations;
}

function generateSimResult(batchId: string, strategyId: string): SimulationResult {
  const profile = profiles[strategyId] || profiles.s1;
  const baseCount = baseVehicleCounts[batchId] || 22;
  const vehicleCount = Math.max(15, Math.round(baseCount * profile.vehicleCountFactor));
  const details = generateVehicleDetails(batchId, strategyId, vehicleCount);

  const totalDistance = details.reduce((s, d) => s + d.distance, 0);
  const totalDuration = details.reduce((s, d) => s + d.duration, 0);
  const avgLoadRate = details.reduce((s, d) => s + d.loadRate, 0) / details.length;
  const maxDistance = Math.max(...details.map(d => d.distance));
  const maxDuration = Math.max(...details.map(d => d.duration));
  const maxStopInterval = Math.max(...details.map(d => d.maxStopInterval));

  // V2: vehicle count by type
  const vehicleCountByType: Record<string, number> = {};
  const loadRateByType: Record<string, number[]> = {};
  for (const d of details) {
    vehicleCountByType[d.vehicleType] = (vehicleCountByType[d.vehicleType] || 0) + 1;
    if (!loadRateByType[d.vehicleType]) loadRateByType[d.vehicleType] = [];
    loadRateByType[d.vehicleType].push(d.loadRate);
  }
  const avgLoadRateByType: Record<string, number> = {};
  for (const [type, rates] of Object.entries(loadRateByType)) {
    avgLoadRateByType[type] = +(rates.reduce((s, v) => s + v, 0) / rates.length).toFixed(1);
  }

  // V2: constraint violations
  const constraintViolations = computeConstraintViolations(details);

  return {
    batchId,
    strategyId,
    vehicleCount,
    totalDistance: +totalDistance.toFixed(1),
    totalDuration: +totalDuration.toFixed(0),
    avgLoadRate: +avgLoadRate.toFixed(1),
    maxDistance: +maxDistance.toFixed(1),
    maxDuration: +maxDuration.toFixed(0),
    maxStopInterval: +maxStopInterval.toFixed(1),
    vehicleDetails: details,
    vehicleCountByType,
    avgLoadRateByType,
    constraintViolations,
  };
}

// Generate all simulation results for default report (3 batches × 3 strategies)
const defaultBatches = ['b1', 'b2', 'b3'];
const defaultStrategies = ['s1', 's2', 's3'];

export const mockSimulationResults: SimulationResult[] = [];

for (const bid of defaultBatches) {
  for (const sid of defaultStrategies) {
    mockSimulationResults.push(generateSimResult(bid, sid));
  }
}

// For report #2 (completed): 5 batches × 4 strategies
const report2Batches = ['b1', 'b2', 'b3', 'b4', 'b5'];
const report2Strategies = ['s1', 's2', 's3', 's4'];

export const mockSimulationResults2: SimulationResult[] = [];
for (const bid of report2Batches) {
  for (const sid of report2Strategies) {
    mockSimulationResults2.push(generateSimResult(bid, sid));
  }
}

export function getSimulationResults(reportId: string): SimulationResult[] {
  if (reportId === 'r2') return mockSimulationResults2;
  return mockSimulationResults;
}

export function getResultsForBatchAndStrategy(
  results: SimulationResult[],
  batchId: string,
  strategyId: string
): SimulationResult | undefined {
  return results.find(r => r.batchId === batchId && r.strategyId === strategyId);
}
