/**
 * Unified Scoring Module for POC Report
 *
 * Design rationale:
 * This module centralizes all strategy scoring logic to ensure consistency
 * across the radar chart (S1), ranking chart (S2), Excel export, and AI insights.
 *
 * Scoring philosophy:
 * - Economy & Feasibility use a "relative improvement" model:
 *   Manual strategy (baseline) scores 50; algorithm improvements map linearly above 50.
 *   This is appropriate for a POC report whose purpose is to demonstrate algorithm value
 *   relative to the manual dispatch baseline.
 * - Constraint compliance uses a "deduction" model:
 *   Starting from 100, violation rates reduce the score. This is independent of
 *   manual/algorithm comparison since all strategies should comply with constraints.
 * - All scores are clamped to [0, 100] to prevent visual anomalies.
 * - Weights are configurable via ScoringWeights (default: economy 0.4, constraint 0.3, feasibility 0.3).
 */

import type { SimulationResult, ScoringWeights } from '../types';
import { defaultScoringWeights } from '../types';

export interface StrategyScores {
  economy: number;      // 0-100
  constraint: number;   // 0-100
  feasibility: number;  // 0-100
  overall: number;      // weighted composite
}

/** Clamp a value to [0, 100] with one decimal */
function clampScore(v: number): number {
  return +Math.min(100, Math.max(0, v)).toFixed(1);
}

/**
 * Calculate economy score for a strategy.
 *
 * Sub-indicators (equally weighted within economy):
 * - Vehicle count saving rate (30%): fewer vehicles = lower deployment cost
 * - Distance saving rate (30%): shorter distance = lower fuel/toll cost
 * - Duration saving rate (20%): shorter time = lower labor cost
 * - Load rate improvement (20%): higher load = better vehicle utilization
 *
 * Each sub-indicator: 50 + improvement_pct * 2.5
 * This maps: 0% improvement → 50, 4% → 60, 10% → 75, 20% → 100 (cap)
 * The mapping gives good spread in the 55-85 range for typical POC improvements.
 */
function calculateEconomyScore(
  strategyResults: SimulationResult[],
  manualResults: SimulationResult[] | null,
): number {
  const totalDist = strategyResults.reduce((s, r) => s + r.totalDistance, 0);
  const totalDur = strategyResults.reduce((s, r) => s + r.totalDuration, 0);
  const vehicleCount = strategyResults.reduce((s, r) => s + r.vehicleCount, 0);
  const allVehicles = strategyResults.flatMap(r => r.vehicleDetails);
  const n = allVehicles.length || 1;
  const avgLoadRate = allVehicles.reduce((s, v) => s + v.loadRate, 0) / n;

  if (!manualResults || manualResults.length === 0) {
    // No manual baseline: use absolute benchmarks
    // Load rate above 90% is good, each % above adds points
    const loadScore = clampScore(40 + avgLoadRate * 0.6);
    return loadScore;
  }

  const mDist = manualResults.reduce((s, r) => s + r.totalDistance, 0);
  const mDur = manualResults.reduce((s, r) => s + r.totalDuration, 0);
  const mVehicles = manualResults.reduce((s, r) => s + r.vehicleCount, 0);
  const mAllVehicles = manualResults.flatMap(r => r.vehicleDetails);
  const mN = mAllVehicles.length || 1;
  const mAvgLoadRate = mAllVehicles.reduce((s, v) => s + v.loadRate, 0) / mN;

  // Improvement percentages (positive = better than manual)
  const distSavingPct = mDist > 0 ? ((mDist - totalDist) / mDist) * 100 : 0;
  const durSavingPct = mDur > 0 ? ((mDur - totalDur) / mDur) * 100 : 0;
  const vehicleSavingPct = mVehicles > 0 ? ((mVehicles - vehicleCount) / mVehicles) * 100 : 0;
  const loadImprovement = avgLoadRate - mAvgLoadRate; // percentage points

  // Sub-scores: 50 + improvement * scaling
  // scaling of 2.5 maps 20% improvement → 100 (cap), gives good spread for 5-15%
  const distScore = clampScore(50 + distSavingPct * 2.5);
  const durScore = clampScore(50 + durSavingPct * 2.5);
  const vehicleScore = clampScore(50 + vehicleSavingPct * 2.5);
  const loadScore = clampScore(50 + loadImprovement * 3); // load improvement is usually small (1-3pp)

  // Weighted average: vehicle count 30%, distance 30%, duration 20%, load rate 20%
  return clampScore(distScore * 0.3 + vehicleScore * 0.3 + durScore * 0.2 + loadScore * 0.2);
}

/**
 * Calculate constraint compliance score.
 *
 * Deduction model: start at 100, deduct for violations.
 * Uses average violation rate across all constraint types, weighted by severity.
 *
 * The deduction coefficient (1.5) is calibrated so that:
 * - 5% avg violation rate → ~92.5 (good)
 * - 10% → ~85 (acceptable)
 * - 20% → ~70 (concerning)
 * - 40% → ~40 (poor)
 * - This avoids the previous formula's problem of hitting 0 at 20% violation rate.
 */
function calculateConstraintScore(strategyResults: SimulationResult[]): number {
  const batchCount = strategyResults.length || 1;

  // Compute average max violation rate across batches
  // Using max violation rate per batch captures the worst constraint for each run
  const totalMaxRate = strategyResults.reduce((sum, r) => {
    if (r.constraintViolations.length === 0) return sum;
    const maxRate = Math.max(...r.constraintViolations.map(v => v.violationRate));
    return sum + maxRate;
  }, 0);
  const avgMaxRate = totalMaxRate / batchCount;

  // Also consider the average across all constraint types for a secondary penalty
  const allViolations = strategyResults.flatMap(r => r.constraintViolations);
  const avgOverallRate = allViolations.length > 0
    ? allViolations.reduce((s, v) => s + v.violationRate, 0) / allViolations.length
    : 0;

  // Combined deduction: primarily from max rate, with smaller contribution from overall
  const deduction = avgMaxRate * 1.2 + avgOverallRate * 0.3;
  return clampScore(100 - deduction);
}

/**
 * Calculate feasibility score.
 *
 * Measures route quality based on operational feasibility metrics.
 * Uses relative improvement model (same as economy):
 * - Manual baseline = 50
 * - Better metrics → higher score
 *
 * Sub-indicators:
 * - Route span (25%): lower span = more compact routes
 * - Cross-region count (25%): fewer crossings = less operational complexity
 * - Detour ratio (25%): lower = more direct routes
 * - TopK proximity (25%): lower = better spatial clustering
 *
 * For metrics where lower is better, "improvement" = (manual - algo) / manual * 100
 */
function calculateFeasibilityScore(
  strategyResults: SimulationResult[],
  manualResults: SimulationResult[] | null,
): number {
  const allVehicles = strategyResults.flatMap(r => r.vehicleDetails);
  const n = allVehicles.length || 1;

  const avgSpan = allVehicles.reduce((s, v) => s + v.routeSpan, 0) / n;
  const avgCross = allVehicles.reduce((s, v) => s + v.crossRegionCount, 0) / n;
  const detours = allVehicles.map(v => v.detourRatio).filter((v): v is number => v !== undefined);
  const avgDetour = detours.length > 0 ? detours.reduce((s, v) => s + v, 0) / detours.length : 120;
  const avgTopK = allVehicles.reduce((s, v) => s + v.topKAvg, 0) / n;

  if (!manualResults || manualResults.length === 0) {
    // No manual baseline: absolute benchmark scoring
    // Route span: 30km is excellent, 60km is average
    const spanScore = clampScore(90 - avgSpan);
    // Cross-region: 0 is perfect, 3+ is poor
    const crossScore = clampScore(100 - avgCross * 20);
    // Detour: 100% is perfect, 140%+ is poor
    const detourScore = clampScore(100 - (avgDetour - 100) * 2);
    // TopK: 3km is excellent, 8km+ is poor
    const topKScore = clampScore(100 - avgTopK * 10);
    return clampScore((spanScore + crossScore + detourScore + topKScore) / 4);
  }

  const mVehicles = manualResults.flatMap(r => r.vehicleDetails);
  const mN = mVehicles.length || 1;
  const mSpan = mVehicles.reduce((s, v) => s + v.routeSpan, 0) / mN;
  const mCross = mVehicles.reduce((s, v) => s + v.crossRegionCount, 0) / mN;
  const mDetours = mVehicles.map(v => v.detourRatio).filter((v): v is number => v !== undefined);
  const mDetour = mDetours.length > 0 ? mDetours.reduce((s, v) => s + v, 0) / mDetours.length : 120;
  const mTopK = mVehicles.reduce((s, v) => s + v.topKAvg, 0) / mN;

  // Improvement rates (positive = better than manual, for "lower is better" metrics)
  const spanImprove = mSpan > 0 ? ((mSpan - avgSpan) / mSpan) * 100 : 0;
  const crossImprove = mCross > 0 ? ((mCross - avgCross) / mCross) * 100 : 0;
  const detourImprove = mDetour > 100 ? ((mDetour - avgDetour) / (mDetour - 100)) * 100 : 0;
  const topKImprove = mTopK > 0 ? ((mTopK - avgTopK) / mTopK) * 100 : 0;

  const spanScore = clampScore(50 + spanImprove * 2.5);
  const crossScore = clampScore(50 + crossImprove * 2.5);
  const detourScore = clampScore(50 + detourImprove * 1.5); // detour changes tend to be larger %
  const topKScore = clampScore(50 + topKImprove * 2.5);

  return clampScore((spanScore + crossScore + detourScore + topKScore) / 4);
}

/**
 * Calculate all scores for a single strategy.
 *
 * @param strategyResults - All SimulationResults for this strategy (across batches)
 * @param manualResults - All SimulationResults for the manual strategy (null if no manual baseline)
 * @param weights - Scoring weights for the three dimensions
 */
export function calculateStrategyScores(
  strategyResults: SimulationResult[],
  manualResults: SimulationResult[] | null,
  weights: ScoringWeights = defaultScoringWeights,
): StrategyScores {
  const economy = calculateEconomyScore(strategyResults, manualResults);
  const constraint = calculateConstraintScore(strategyResults);
  const feasibility = calculateFeasibilityScore(strategyResults, manualResults);
  const overall = clampScore(
    economy * weights.economic + constraint * weights.constraint + feasibility * weights.feasibility,
  );

  return { economy, constraint, feasibility, overall };
}

/**
 * Calculate scores for all strategies in a report.
 * Returns a map from strategy ID to scores.
 */
export function calculateAllStrategyScores(
  results: SimulationResult[],
  strategyIds: string[],
  weights: ScoringWeights = defaultScoringWeights,
): Map<string, StrategyScores> {
  // Find manual strategy results (strategy with id 's1' or type 'manual')
  const manualId = strategyIds.find(id => id === 's1');
  const manualResults = manualId ? results.filter(r => r.strategyId === manualId) : null;

  const scoreMap = new Map<string, StrategyScores>();

  for (const sid of strategyIds) {
    const sResults = results.filter(r => r.strategyId === sid);
    // Manual strategy compares against itself (manualResults === sResults)
    // This naturally produces score=50 for economy/feasibility, which is correct
    const scores = calculateStrategyScores(
      sResults,
      manualResults,
      weights,
    );
    scoreMap.set(sid, scores);
  }

  return scoreMap;
}
